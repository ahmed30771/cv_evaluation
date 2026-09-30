import { randomUUID } from "crypto";
import { ensureSchema, getSql } from "./db";
import { getUploadMeta } from "./uploads";

export const DRAFT_SECTION_KEYS = [
  "personal_information",
  "summary",
  "skills",
  "experience",
  "education",
  "projects",
  "certifications",
] as const;

export type DraftSectionKey = (typeof DRAFT_SECTION_KEYS)[number];
export type DraftSections = Record<DraftSectionKey, string>;

export type PdfOverlayLine = {
  id: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  originalText?: string;
  fontSize: number;
  section?: string;
  isHeader?: boolean;
};

function valueToText(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const row = item as Record<string, unknown>;
          if (typeof row.raw === "string") return row.raw.trim();
          return Object.values(row)
            .filter((v) => typeof v === "string")
            .join(" — ");
        }
        return String(item);
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    if (typeof row.raw === "string") return row.raw.trim();
    return Object.entries(row)
      .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join("\n");
  }
  return String(value);
}

export function normalizeDraftSections(input: unknown): DraftSections {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out = {} as DraftSections;
  for (const key of DRAFT_SECTION_KEYS) {
    out[key] = valueToText(src[key]);
  }
  return out;
}

export function normalizeOverlays(input: unknown): PdfOverlayLine[] {
  if (!Array.isArray(input)) return [];
  const out: PdfOverlayLine[] = [];
  input.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const text = typeof row.text === "string" ? row.text : "";
    const originalText =
      typeof row.originalText === "string"
        ? row.originalText
        : typeof row.original_text === "string"
          ? row.original_text
          : text;
    out.push({
      id: typeof row.id === "string" && row.id ? row.id : `line-${index}`,
      page: Math.max(1, Number(row.page) || 1),
      x: Number(row.x) || 0,
      y: Number(row.y) || 0,
      w: Math.max(8, Number(row.w) || 40),
      h: Math.max(8, Number(row.h) || 12),
      text,
      originalText,
      fontSize: Math.max(8, Number(row.fontSize) || 11),
      section: typeof row.section === "string" ? row.section : undefined,
      isHeader: Boolean(row.isHeader),
    });
  });
  return out;
}

export function draftToRawText(sections: DraftSections): string {
  const labels: Record<DraftSectionKey, string> = {
    personal_information: "Personal Information",
    summary: "Summary",
    skills: "Skills",
    experience: "Experience",
    education: "Education",
    projects: "Projects",
    certifications: "Certifications",
  };
  const parts: string[] = [];
  for (const key of DRAFT_SECTION_KEYS) {
    const body = sections[key]?.trim();
    if (!body) continue;
    parts.push(`${labels[key]}\n${body}`);
  }
  return parts.join("\n\n").trim();
}

export function overlaysToRawText(overlays: PdfOverlayLine[]): string {
  return [...overlays]
    .sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x)
    .map((l) => l.text.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function getOrCreateDraft(evaluationId: string): Promise<{
  evaluation_id: string;
  sections: DraftSections;
  overlays: PdfOverlayLine[];
  updated_at: string | null;
  original_filename: string;
  status: string;
  file_type: string;
  has_file: boolean;
}> {
  await ensureSchema();
  const sql = getSql();

  const evaluations = await sql`
    SELECT id, status, original_filename, file_type
    FROM evaluations
    WHERE id = ${evaluationId}
    LIMIT 1
  `;
  if (!evaluations[0]) throw new Error("Evaluation not found");

  const upload = await getUploadMeta(evaluationId);
  const existing = await sql`
    SELECT sections, overlays, updated_at
    FROM cv_drafts
    WHERE evaluation_id = ${evaluationId}
    LIMIT 1
  `;

  if (existing[0]) {
    const rawOverlays = existing[0].overlays;
    // Old overlay saves without section tags — re-map from PDF.
    const needsReseed =
      Array.isArray(rawOverlays) &&
      rawOverlays.length > 0 &&
      rawOverlays.every(
        (row) =>
          !row ||
          typeof row !== "object" ||
          (!("originalText" in (row as object)) && !("original_text" in (row as object))) ||
          !("section" in (row as object)),
      );

    return {
      evaluation_id: evaluationId,
      sections: normalizeDraftSections(existing[0].sections),
      overlays: needsReseed ? [] : normalizeOverlays(rawOverlays),
      updated_at: existing[0].updated_at ? String(existing[0].updated_at) : null,
      original_filename: String(evaluations[0].original_filename),
      status: String(evaluations[0].status),
      file_type: String(evaluations[0].file_type),
      has_file: !!upload,
    };
  }

  const extractions = await sql`
    SELECT sections
    FROM cv_extractions
    WHERE evaluation_id = ${evaluationId}
    LIMIT 1
  `;
  const sections = normalizeDraftSections(extractions[0]?.sections ?? {});

  await sql.query(
    `INSERT INTO cv_drafts (id, evaluation_id, sections, overlays, updated_at)
     VALUES ($1, $2, $3::jsonb, '[]'::jsonb, now())
     ON CONFLICT (evaluation_id) DO NOTHING`,
    [randomUUID(), evaluationId, JSON.stringify(sections)],
  );

  return {
    evaluation_id: evaluationId,
    sections,
    overlays: [],
    updated_at: new Date().toISOString(),
    original_filename: String(evaluations[0].original_filename),
    status: String(evaluations[0].status),
    file_type: String(evaluations[0].file_type),
    has_file: !!upload,
  };
}

export async function saveDraft(
  evaluationId: string,
  sectionsInput: unknown,
  overlaysInput?: unknown,
): Promise<{ sections: DraftSections; overlays: PdfOverlayLine[] }> {
  await ensureSchema();
  const sql = getSql();
  const sections = normalizeDraftSections(sectionsInput);
  const overlays = overlaysInput === undefined ? null : normalizeOverlays(overlaysInput);

  const evaluations = await sql`SELECT id FROM evaluations WHERE id = ${evaluationId} LIMIT 1`;
  if (!evaluations[0]) throw new Error("Evaluation not found");

  const existing = await sql`SELECT id, overlays FROM cv_drafts WHERE evaluation_id = ${evaluationId} LIMIT 1`;
  const nextOverlays = overlays ?? normalizeOverlays(existing[0]?.overlays);

  if (existing[0]) {
    await sql.query(
      `UPDATE cv_drafts SET sections = $1::jsonb, overlays = $2::jsonb, updated_at = now() WHERE evaluation_id = $3`,
      [JSON.stringify(sections), JSON.stringify(nextOverlays), evaluationId],
    );
  } else {
    await sql.query(
      `INSERT INTO cv_drafts (id, evaluation_id, sections, overlays, updated_at) VALUES ($1, $2, $3::jsonb, $4::jsonb, now())`,
      [randomUUID(), evaluationId, JSON.stringify(sections), JSON.stringify(nextOverlays)],
    );
  }
  return { sections, overlays: nextOverlays };
}
