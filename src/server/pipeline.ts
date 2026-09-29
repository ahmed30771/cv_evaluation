import { randomUUID } from "crypto";
import { ensureSchema, getSql } from "./db";
import { extractText, parseSections } from "./extract";
import { detectInjection, neutralizeInjectionSpans } from "./integrity";
import { evaluateCv } from "./openrouter";
import { applyChecklistCaps, checklistSignals } from "./scoring";

function safeError(err: unknown): string {
  const msg = String(err ?? "");
  if (/OpenRouter|401|402|429/i.test(msg)) {
    return "AI evaluation service is temporarily unavailable. Please try again.";
  }
  if (/extract|text/i.test(msg)) return msg.slice(0, 300);
  return "Evaluation failed. Please try another file or try again later.";
}

export async function runEvaluationFromUpload(opts: {
  filename: string;
  fileType: "pdf" | "docx";
  fileSize: number;
  buffer: Buffer;
}) {
  await ensureSchema();
  const sql = getSql();
  const id = randomUUID();
  const started = Date.now();

  await sql`
    INSERT INTO evaluations (id, status, original_filename, file_type, file_size, storage_path)
    VALUES (${id}, 'uploaded', ${opts.filename}, ${opts.fileType}, ${opts.fileSize}, '')
  `;

  try {
    await sql`UPDATE evaluations SET status = 'extracting' WHERE id = ${id}`;

    const rawText = await extractText(opts.buffer, opts.fileType);
    if (!rawText || rawText.trim().length < 40) {
      throw new Error(
        "Could not extract enough text from this file. Use a text-based PDF or DOCX (scanned image-only PDFs are not supported in MVP).",
      );
    }

    const sections = parseSections(rawText);
    const injectionHit = detectInjection(rawText);

    await sql.query(
      `INSERT INTO cv_extractions (evaluation_id, raw_text, sections) VALUES ($1, $2, $3::jsonb)`,
      [id, rawText, JSON.stringify(sections)],
    );
    await sql`
      UPDATE evaluations
      SET status = 'evaluating', injection_heuristic_hit = ${injectionHit}
      WHERE id = ${id}
    `;

    const textForLlm = injectionHit ? neutralizeInjectionSpans(rawText) : rawText;
    const result = await evaluateCv(textForLlm);
    const signals = checklistSignals(rawText, sections);
    const scores = applyChecklistCaps(result.scores, signals, injectionHit);
    const findings = [...result.findings];

    if (injectionHit) {
      findings.unshift({
        type: "issue",
        section: "overall",
        title: "Instruction-like text detected in CV",
        detail:
          "This CV contains text that looks like an attempt to instruct the AI (for example asking for a perfect score). Scores are based on the evaluation rubric only and ignore embedded commands.",
        severity: "high",
        sort_order: -1,
      });
    }

    await sql`
      INSERT INTO evaluation_scores (evaluation_id, overall, ats, experience, skills, content, formatting)
      VALUES (
        ${id},
        ${scores.overall},
        ${scores.ats},
        ${scores.experience},
        ${scores.skills},
        ${scores.content},
        ${scores.formatting}
      )
    `;

    for (const f of findings) {
      await sql`
        INSERT INTO evaluation_findings (evaluation_id, type, section, title, detail, severity, sort_order)
        VALUES (
          ${id},
          ${f.type},
          ${f.section ?? null},
          ${f.title},
          ${f.detail},
          ${f.severity ?? null},
          ${f.sort_order ?? 0}
        )
      `;
    }

    const processingMs = Date.now() - started;
    await sql`
      UPDATE evaluations
      SET status = 'completed',
          completed_at = now(),
          processing_ms = ${processingMs},
          error_message = NULL
      WHERE id = ${id}
    `;

    return { id, status: "completed" as const, original_filename: opts.filename };
  } catch (err) {
    const processingMs = Date.now() - started;
    await sql`
      UPDATE evaluations
      SET status = 'failed',
          completed_at = now(),
          processing_ms = ${processingMs},
          error_message = ${safeError(err)}
      WHERE id = ${id}
    `;
    return { id, status: "failed" as const, original_filename: opts.filename };
  }
}
