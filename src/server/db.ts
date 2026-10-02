import { neon } from "@neondatabase/serverless";

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Neon pooler + channel_binding can break some drivers; strip if present
  const cleaned = url.replace("&channel_binding=require", "").replace("?channel_binding=require&", "?");
  return neon(cleaned);
}

export async function ensureSchema() {
  const sql = getSql();

  // Best-effort; Neon may already provide gen_random_uuid()
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  } catch {
    /* ignore */
  }

  await sql`
    CREATE TABLE IF NOT EXISTS evaluations (
      id UUID PRIMARY KEY,
      status TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size BIGINT NOT NULL,
      storage_path TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      completed_at TIMESTAMPTZ,
      error_message TEXT,
      processing_ms INTEGER,
      injection_heuristic_hit BOOLEAN NOT NULL DEFAULT false
    )
  `;

  // Upgrade older tables created without this column
  try {
    await sql`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS injection_heuristic_hit BOOLEAN NOT NULL DEFAULT false`;
  } catch {
    /* ignore */
  }

  try {
    await sql`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS score_content_hash TEXT`;
  } catch {
    /* ignore */
  }

  await sql`
    CREATE TABLE IF NOT EXISTS cv_extractions (
      id UUID PRIMARY KEY,
      evaluation_id UUID NOT NULL UNIQUE REFERENCES evaluations(id) ON DELETE CASCADE,
      raw_text TEXT NOT NULL,
      sections JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS evaluation_scores (
      id UUID PRIMARY KEY,
      evaluation_id UUID NOT NULL UNIQUE REFERENCES evaluations(id) ON DELETE CASCADE,
      overall SMALLINT NOT NULL,
      ats SMALLINT NOT NULL,
      experience SMALLINT NOT NULL,
      skills SMALLINT NOT NULL,
      content SMALLINT NOT NULL,
      formatting SMALLINT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS evaluation_findings (
      id UUID PRIMARY KEY,
      evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      section TEXT,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      severity TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS cv_rewrites (
      id UUID PRIMARY KEY,
      evaluation_id UUID NOT NULL UNIQUE REFERENCES evaluations(id) ON DELETE CASCADE,
      content JSONB NOT NULL DEFAULT '{}'::jsonb,
      template_id TEXT NOT NULL DEFAULT 'classic',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  try {
    await sql`ALTER TABLE cv_rewrites ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb`;
  } catch {
    /* ignore */
  }
}
