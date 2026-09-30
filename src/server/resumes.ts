import { randomUUID } from "crypto";
import { ensureSchema, getSql } from "@/server/db";
import { emptyStructuredCv, isTemplateId, type TemplateId } from "@/server/cv-model";
import { saveRewrite, type CvRewriteRow } from "@/server/rewrite";

export type ResumeMeta = {
  target_role?: string;
  preference?: "ats" | "visual";
  source?: "blank" | "upload";
};

export async function createBlankResume(opts?: {
  template_id?: TemplateId;
  meta?: ResumeMeta;
}): Promise<CvRewriteRow & { meta: ResumeMeta }> {
  await ensureSchema();
  const sql = getSql();
  const id = randomUUID();
  const templateId = opts?.template_id && isTemplateId(opts.template_id) ? opts.template_id : "classic";
  const meta: ResumeMeta = {
    source: "blank",
    target_role: opts?.meta?.target_role || "",
    preference: opts?.meta?.preference === "visual" ? "visual" : "ats",
  };

  await sql`
    INSERT INTO evaluations (
      id, status, original_filename, file_type, file_size, storage_path,
      completed_at, processing_ms, injection_heuristic_hit
    )
    VALUES (
      ${id},
      'completed',
      'Untitled resume',
      'blank',
      0,
      '',
      now(),
      0,
      false
    )
  `;

  await sql.query(
    `INSERT INTO cv_extractions (id, evaluation_id, raw_text, sections)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [randomUUID(), id, "", JSON.stringify({})],
  );

  const row = await saveRewrite(id, emptyStructuredCv(), templateId);
  await sql.query(`UPDATE cv_rewrites SET meta = $1::jsonb WHERE evaluation_id = $2`, [
    JSON.stringify(meta),
    id,
  ]);

  return { ...row, meta };
}
