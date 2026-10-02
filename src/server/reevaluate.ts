import { randomUUID } from "crypto";
import {
  draftToRawText,
  getOrCreateDraft,
  overlaysToRawText,
  saveDraft,
  type DraftSections,
  type PdfOverlayLine,
} from "./draft";
import { ensureSchema, getSql } from "./db";
import { detectInjection, neutralizeInjectionSpans } from "./integrity";
import { evaluateCv } from "./openrouter";
import { finalizeScores, hashScoreContent, type Scores } from "./scoring";
import { parseSections } from "./extract";

function safeError(err: unknown): string {
  const msg = String(err ?? "");
  if (/DATABASE_URL|OPENROUTER_API_KEY|misconfigured/i.test(msg)) return msg.slice(0, 300);
  if (/OpenRouter|401|402|429|rate-limited|rate limit/i.test(msg)) {
    if (/\b429\b|rate-limited|rate limit/i.test(msg)) {
      return "AI model is rate-limited right now. Please wait about a minute and try again.";
    }
    return "AI evaluation service is temporarily unavailable. Please try again.";
  }
  return `Re-evaluation failed: ${msg.slice(0, 220)}`;
}

async function loadPreviousScores(evaluationId: string): Promise<Scores | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT overall, ats, experience, skills, content, formatting
    FROM evaluation_scores
    WHERE evaluation_id = ${evaluationId}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return {
    overall: Number(rows[0].overall),
    ats: Number(rows[0].ats),
    experience: Number(rows[0].experience),
    skills: Number(rows[0].skills),
    content: Number(rows[0].content),
    formatting: Number(rows[0].formatting),
  };
}

export async function reevaluateFromDraft(
  evaluationId: string,
  opts?: { sections?: unknown; overlays?: unknown; raw_text?: string },
): Promise<{ overall: number }> {
  await ensureSchema();
  const sql = getSql();
  const started = Date.now();

  const evaluations = await sql`
    SELECT id, status, score_content_hash FROM evaluations WHERE id = ${evaluationId} LIMIT 1
  `;
  if (!evaluations[0]) throw new Error("Evaluation not found");

  let sections: DraftSections;
  let overlays: PdfOverlayLine[] = [];

  if (opts?.sections) {
    const saved = await saveDraft(evaluationId, opts.sections, opts.overlays);
    sections = saved.sections;
    overlays = saved.overlays;
  } else {
    const draft = await getOrCreateDraft(evaluationId);
    sections = draft.sections;
    overlays = draft.overlays;
  }

  const fromOverlays = overlaysToRawText(overlays);
  const rawText = (opts?.raw_text?.trim() || fromOverlays || draftToRawText(sections)).trim();
  if (rawText.length < 40) {
    throw new Error("Draft is too short to re-evaluate. Add more CV content first.");
  }

  const contentHash = hashScoreContent(rawText);
  const previousHash = evaluations[0].score_content_hash
    ? String(evaluations[0].score_content_hash)
    : null;
  const previousScores = await loadPreviousScores(evaluationId);

  // Identical CV text → identical score (no LLM re-roll).
  if (previousHash && previousHash === contentHash && previousScores) {
    await sql`
      UPDATE evaluations
      SET status = 'completed',
          completed_at = now(),
          processing_ms = ${Date.now() - started},
          error_message = NULL
      WHERE id = ${evaluationId}
    `;
    return { overall: previousScores.overall };
  }

  await sql`
    UPDATE evaluations SET status = 'evaluating', error_message = NULL WHERE id = ${evaluationId}
  `;

  try {
    const injectionHit = detectInjection(rawText);
    const textForLlm = injectionHit ? neutralizeInjectionSpans(rawText) : rawText;
    const parsedSections = parseSections(rawText);
    const result = await evaluateCv(textForLlm);
    const scores = finalizeScores({
      llm: result.scores,
      rawText,
      sections: parsedSections,
      injectionHit,
      previous: previousScores,
    });
    const findings = [...result.findings];

    if (injectionHit) {
      findings.unshift({
        type: "issue",
        section: "overall",
        title: "Instruction-like text detected in CV",
        detail:
          "This CV contains text that looks like an attempt to instruct the AI. Scores follow the rubric only.",
        severity: "high",
        sort_order: -1,
      });
    }

    await sql`DELETE FROM evaluation_scores WHERE evaluation_id = ${evaluationId}`;
    await sql`DELETE FROM evaluation_findings WHERE evaluation_id = ${evaluationId}`;

    await sql`
      INSERT INTO evaluation_scores (id, evaluation_id, overall, ats, experience, skills, content, formatting)
      VALUES (
        ${randomUUID()},
        ${evaluationId},
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
          ${evaluationId},
          ${f.type},
          ${f.section ?? null},
          ${f.title},
          ${f.detail},
          ${f.severity ?? null},
          ${f.sort_order ?? 0}
        )
      `;
    }

    await sql.query(`UPDATE cv_extractions SET sections = $1::jsonb, raw_text = $2 WHERE evaluation_id = $3`, [
      JSON.stringify(parsedSections),
      rawText,
      evaluationId,
    ]);

    const processingMs = Date.now() - started;
    await sql`
      UPDATE evaluations
      SET status = 'completed',
          completed_at = now(),
          processing_ms = ${processingMs},
          injection_heuristic_hit = ${injectionHit},
          score_content_hash = ${contentHash},
          error_message = NULL
      WHERE id = ${evaluationId}
    `;

    return { overall: scores.overall };
  } catch (err) {
    console.error("Re-evaluate failed", err);
    const processingMs = Date.now() - started;
    await sql`
      UPDATE evaluations
      SET status = 'failed',
          completed_at = now(),
          processing_ms = ${processingMs},
          error_message = ${safeError(err)}
      WHERE id = ${evaluationId}
    `;
    throw new Error(safeError(err));
  }
}
