import { randomUUID } from "crypto";
import { ensureSchema, getSql } from "./db";
import { extractText, parseSections } from "./extract";
import { detectInjection, neutralizeInjectionSpans } from "./integrity";
import { evaluateCv } from "./openrouter";
import { applyChecklistCaps, checklistSignals } from "./scoring";

function safeError(err: unknown): string {
  const msg = String(err ?? "");
  if (/DATABASE_URL|OPENROUTER_API_KEY|misconfigured/i.test(msg)) return msg.slice(0, 300);
  if (/OpenRouter|401|402|429|rate-limited|rate limit/i.test(msg)) {
    if (/\b429\b|rate-limited|rate limit/i.test(msg)) {
      return "AI model is rate-limited right now. Please wait about a minute and try again.";
    }
    return "AI evaluation service is temporarily unavailable. Please try again.";
  }
  if (/extract|text|pdf|docx|mammoth|unpdf/i.test(msg)) return msg.slice(0, 300);
  return `Evaluation failed: ${msg.slice(0, 220)}`;
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
    INSERT INTO evaluations (
      id, status, original_filename, file_type, file_size, storage_path, injection_heuristic_hit
    )
    VALUES (
      ${id}, 'uploaded', ${opts.filename}, ${opts.fileType}, ${opts.fileSize}, '', false
    )
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
      `INSERT INTO cv_extractions (id, evaluation_id, raw_text, sections) VALUES ($1, $2, $3, $4::jsonb)`,
      [randomUUID(), id, rawText, JSON.stringify(sections)],
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
      INSERT INTO evaluation_scores (id, evaluation_id, overall, ats, experience, skills, content, formatting)
      VALUES (
        ${randomUUID()},
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
        INSERT INTO evaluation_findings (id, evaluation_id, type, section, title, detail, severity, sort_order)
        VALUES (
          ${randomUUID()},
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
    console.error("Evaluation pipeline failed", err);
    const processingMs = Date.now() - started;
    await sql`
      UPDATE evaluations
      SET status = 'failed',
          completed_at = now(),
          processing_ms = ${processingMs},
          error_message = ${safeError(err)}
      WHERE id = ${id}
    `;
    // Surface failure to the client instead of a silent 201
    throw new Error(safeError(err));
  }
}
