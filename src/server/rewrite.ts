import { randomUUID } from "crypto";
import { ensureSchema, getSql } from "@/server/db";
import {
  isTemplateId,
  normalizeStructuredCv,
  seedFromExtraction,
  type StructuredCv,
  type TemplateId,
} from "@/server/cv-model";
import { rewriteCv } from "@/server/openrouter";
import type { ResumeMeta } from "@/server/resumes";

export type CvRewriteRow = {
  evaluation_id: string;
  content: StructuredCv;
  template_id: TemplateId;
  updated_at?: string | null;
  meta?: ResumeMeta;
};

function normalizeMeta(raw: unknown): ResumeMeta {
  if (!raw || typeof raw !== "object") return {};
  const m = raw as Record<string, unknown>;
  return {
    target_role: typeof m.target_role === "string" ? m.target_role.slice(0, 120) : "",
    preference: m.preference === "visual" ? "visual" : m.preference === "ats" ? "ats" : undefined,
    source: m.source === "blank" || m.source === "upload" ? m.source : undefined,
  };
}

async function assertEvaluationCompleted(evaluationId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, status FROM evaluations WHERE id = ${evaluationId} LIMIT 1
  `;
  if (!rows[0]) throw new Error("Evaluation not found");
  if (rows[0].status !== "completed") {
    throw new Error("Evaluation must be completed before rewriting the CV");
  }
}

export async function getRewrite(evaluationId: string): Promise<CvRewriteRow | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT evaluation_id, content, template_id, updated_at, meta
    FROM cv_rewrites
    WHERE evaluation_id = ${evaluationId}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  const templateId = isTemplateId(rows[0].template_id) ? rows[0].template_id : "classic";
  return {
    evaluation_id: String(rows[0].evaluation_id),
    content: normalizeStructuredCv(rows[0].content),
    template_id: templateId,
    updated_at: rows[0].updated_at ? String(rows[0].updated_at) : null,
    meta: normalizeMeta(rows[0].meta),
  };
}

export async function saveRewrite(
  evaluationId: string,
  content: StructuredCv,
  templateId: TemplateId,
  meta?: ResumeMeta,
): Promise<CvRewriteRow> {
  await ensureSchema();
  const sql = getSql();
  const normalized = normalizeStructuredCv(content);
  const existing = await sql`
    SELECT id, meta FROM cv_rewrites WHERE evaluation_id = ${evaluationId} LIMIT 1
  `;
  const nextMeta = meta
    ? { ...normalizeMeta(existing[0]?.meta), ...meta }
    : normalizeMeta(existing[0]?.meta);

  if (existing[0]) {
    await sql.query(
      `UPDATE cv_rewrites
       SET content = $1::jsonb, template_id = $2, meta = $3::jsonb, updated_at = now()
       WHERE evaluation_id = $4`,
      [JSON.stringify(normalized), templateId, JSON.stringify(nextMeta), evaluationId],
    );
  } else {
    await sql.query(
      `INSERT INTO cv_rewrites (id, evaluation_id, content, template_id, meta, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, now())`,
      [randomUUID(), evaluationId, JSON.stringify(normalized), templateId, JSON.stringify(nextMeta)],
    );
  }
  return {
    evaluation_id: evaluationId,
    content: normalized,
    template_id: templateId,
    meta: nextMeta,
  };
}

export async function generateRewrite(
  evaluationId: string,
  opts?: { content?: unknown },
): Promise<CvRewriteRow> {
  await ensureSchema();
  await assertEvaluationCompleted(evaluationId);
  const sql = getSql();

  const extractions = await sql`
    SELECT raw_text, sections
    FROM cv_extractions
    WHERE evaluation_id = ${evaluationId}
    LIMIT 1
  `;
  if (!extractions[0]) throw new Error("CV extraction not found for this evaluation");

  const findings = await sql`
    SELECT type, section, title, detail
    FROM evaluation_findings
    WHERE evaluation_id = ${evaluationId}
    ORDER BY sort_order ASC
  `;

  const rawText = String(extractions[0].raw_text || "");
  const sections = (extractions[0].sections as Record<string, unknown>) || {};
  const existing = await getRewrite(evaluationId);
  const currentCv =
    opts?.content !== undefined
      ? normalizeStructuredCv(opts.content)
      : existing?.content
        ? existing.content
        : undefined;

  let content: StructuredCv;
  try {
    content = await rewriteCv({
      rawText,
      sections,
      findings: findings.map((f) => ({
        type: String(f.type),
        title: String(f.title),
        detail: String(f.detail),
        section: f.section == null ? null : String(f.section),
      })),
      currentCv,
    });
  } catch (err) {
    const seeded = seedFromExtraction(rawText, sections);
    if (!seeded.personal.fullName && !seeded.summary && !seeded.experience.length) {
      throw err;
    }
    content = seeded;
  }

  // Keep editor layout prefs from the draft being improved.
  if (currentCv) {
    content = {
      ...content,
      sectionOrder: currentCv.sectionOrder ?? content.sectionOrder,
      sectionColumns: currentCv.sectionColumns ?? content.sectionColumns,
    };
  }

  const templateId = existing?.template_id || "classic";
  return saveRewrite(evaluationId, content, templateId, { source: "upload", ...existing?.meta });
}

export async function updateRewrite(
  evaluationId: string,
  opts: { content?: unknown; template_id?: unknown; meta?: ResumeMeta },
): Promise<CvRewriteRow> {
  await ensureSchema();
  await assertEvaluationCompleted(evaluationId);
  const existing = await getRewrite(evaluationId);
  if (!existing) throw new Error("No rewrite found. Generate one first.");

  const templateId = isTemplateId(opts.template_id) ? opts.template_id : existing.template_id;
  const content =
    opts.content !== undefined ? normalizeStructuredCv(opts.content) : existing.content;
  return saveRewrite(evaluationId, content, templateId, opts.meta);
}
