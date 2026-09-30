import { ensureSchema, getSql } from "./db";

export async function storeUpload(opts: {
  evaluationId: string;
  fileName: string;
  fileType: "pdf" | "docx";
  buffer: Buffer;
}) {
  await ensureSchema();
  const sql = getSql();
  const mime = opts.fileType === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const b64 = opts.buffer.toString("base64");

  await sql.query(
    `INSERT INTO cv_uploads (evaluation_id, file_name, mime_type, content_base64)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (evaluation_id) DO UPDATE SET
       file_name = EXCLUDED.file_name,
       mime_type = EXCLUDED.mime_type,
       content_base64 = EXCLUDED.content_base64`,
    [opts.evaluationId, opts.fileName, mime, b64],
  );
}

export async function getUploadMeta(evaluationId: string): Promise<{
  file_name: string;
  mime_type: string;
  file_type: string;
} | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT u.file_name, u.mime_type, e.file_type
    FROM cv_uploads u
    JOIN evaluations e ON e.id = u.evaluation_id
    WHERE u.evaluation_id = ${evaluationId}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return {
    file_name: String(rows[0].file_name),
    mime_type: String(rows[0].mime_type),
    file_type: String(rows[0].file_type),
  };
}

export async function getUploadBytes(evaluationId: string): Promise<{
  file_name: string;
  mime_type: string;
  buffer: Buffer;
} | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT file_name, mime_type, content_base64
    FROM cv_uploads
    WHERE evaluation_id = ${evaluationId}
    LIMIT 1
  `;
  if (!rows[0]?.content_base64) return null;
  return {
    file_name: String(rows[0].file_name),
    mime_type: String(rows[0].mime_type),
    buffer: Buffer.from(String(rows[0].content_base64), "base64"),
  };
}
