import { randomUUID } from "crypto";
import { ensureSchema, getSql } from "./db";
import { extractText, parseSections } from "./extract";
import { detectInjection, neutralizeInjectionSpans } from "./integrity";
import { evaluateCv } from "./llm";
import { storeUpload } from "./uploads";
import { finalizeScores, hashScoreContent } from "./scoring";

function safeError(err: unknown): string {
  const msg = String(err ?? "");
  console.error("[evaluate]", msg.slice(0, 500));
  if (/DATABASE_URL|GEMINI_API_KEY|GROQ_API_KEY|misconfigured/i.test(msg)) return msg.slice(0, 300);
  if (/\b429\b|\b503\b|rate-limited|rate limit|busy right now|quota|resource_exhausted|high demand|timeout/i.test(msg)) {
    return "AI is busy right now (free model limit). Wait about a minute and try again.";
  }
  if (/\bno longer available\b|\b404\b|not found/i.test(msg)) {
    return "Configured Gemini model is unavailable. Update GEMINI_MODEL (e.g. gemini-3.1-flash-lite) and try again.";
  }
  if (/Gemini|Groq|401|402|403/i.test(msg)) {
    return "AI evaluation service is temporarily unavailable. Please try again.";
  }
  if (/extract|text|pdf|docx|mammoth|unpdf/i.test(msg)) return msg.slice(0, 300);
  return `Evaluation failed: ${msg.slice(0, 220)}`;
}

export type StartedEvaluation = {
  id: string;
  status: "extracting";
  original_filename: string;
  fileType: "pdf" | "docx";
  buffer: Buffer;
  startedAt: number;
};

/** Persist upload quickly, then continue AI work in the background. */
export async function startEvaluationFromUpload(opts: {
  filename: string;
  fileType: "pdf" | "docx";
  fileSize: number;
  buffer: Buffer;
}): Promise<StartedEvaluation> {
  await ensureSchema();
  const sql = getSql();
  const id = randomUUID();

  await sql`
    INSERT INTO evaluations (
      id, status, original_filename, file_type, file_size, storage_path, injection_heuristic_hit
    )
    VALUES (
      ${id}, 'uploaded', ${opts.filename}, ${opts.fileType}, ${opts.fileSize}, '', false
    )
  `;

  await storeUpload({
    evaluationId: id,
    fileName: opts.filename,
    fileType: opts.fileType,
    buffer: opts.buffer,
  }).catch((err) => console.error("storeUpload failed", err));

  await sql`UPDATE evaluations SET status = 'extracting' WHERE id = ${id}`;

  return {
    id,
    status: "extracting",
    original_filename: opts.filename,
    fileType: opts.fileType,
    buffer: opts.buffer,
    startedAt: Date.now(),
  };
}

/** Extract + Gemini evaluate + persist scores (runs after HTTP response). */
export async function processEvaluationJob(job: StartedEvaluation): Promise<void> {
  const sql = getSql();
  const { id, buffer, fileType, startedAt } = job;

  try {
    const rawText = await extractText(buffer, fileType);
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
    const scores = finalizeScores({
      llm: result.scores,
      rawText,
      sections,
      injectionHit,
    });
    const findings = [...result.findings];
    const contentHash = hashScoreContent(rawText);

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

    const processingMs = Date.now() - startedAt;
    await sql`
      UPDATE evaluations
      SET status = 'completed',
          completed_at = now(),
          processing_ms = ${processingMs},
          score_content_hash = ${contentHash},
          error_message = NULL
      WHERE id = ${id}
    `;
  } catch (err) {
    console.error("Evaluation pipeline failed", err);
    const processingMs = Date.now() - startedAt;
    await sql`
      UPDATE evaluations
      SET status = 'failed',
          completed_at = now(),
          processing_ms = ${processingMs},
          error_message = ${safeError(err)}
      WHERE id = ${id}
    `;
  }
}

/** Sync helper for local scripts/tests — waits for full completion. */
export async function runEvaluationFromUpload(opts: {
  filename: string;
  fileType: "pdf" | "docx";
  fileSize: number;
  buffer: Buffer;
}) {
  const started = await startEvaluationFromUpload(opts);
  await processEvaluationJob(started);
  const sql = getSql();
  const rows = await sql`SELECT status, error_message FROM evaluations WHERE id = ${started.id} LIMIT 1`;
  const row = rows[0] as { status?: string; error_message?: string | null } | undefined;
  if (row?.status === "failed") {
    throw new Error(row.error_message || "Evaluation failed");
  }
  return { id: started.id, status: "completed" as const, original_filename: opts.filename };
}
