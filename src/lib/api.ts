// Same-origin Next.js API routes (works on Vercel + local `npm run dev`)
import type { StructuredCv, TemplateId } from "@/lib/cv-types";
import type { TemplateMeta } from "@/lib/templates";

const API_BASE = "";

export type { StructuredCv, TemplateId } from "@/lib/cv-types";
export type { TemplateMeta } from "@/lib/templates";

export type EvaluationStatus = {
  id: string;
  status: "uploaded" | "extracting" | "evaluating" | "completed" | "failed" | string;
  original_filename: string;
  created_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  processing_ms?: number | null;
};

export type Finding = {
  type: "strength" | "issue" | "missing" | "recommendation" | "improvement" | string;
  section?: string | null;
  title: string;
  detail: string;
  severity?: string | null;
};

export type Report = {
  id: string;
  status: string;
  original_filename: string;
  created_at?: string | null;
  completed_at?: string | null;
  processing_ms?: number | null;
  scores: {
    overall: number;
    ats: number;
    experience: number;
    skills: number;
    content: number;
    formatting: number;
  };
  findings: Finding[];
  sections_detected: string[];
};

export type CvRewrite = {
  evaluation_id: string;
  content: StructuredCv;
  template_id: TemplateId;
  updated_at?: string | null;
  templates?: TemplateMeta[];
  meta?: {
    target_role?: string;
    preference?: "ats" | "visual";
    source?: "blank" | "upload";
  };
};

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) return data.detail.map((d: { msg?: string }) => d.msg).join(", ");
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`;
}

export async function createEvaluation(file: File): Promise<{ id: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/v1/evaluations`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function createBlankResume(body?: {
  target_role?: string;
  preference?: "ats" | "visual";
  template_id?: TemplateId;
}): Promise<CvRewrite & { id: string }> {
  const res = await fetch(`${API_BASE}/api/v1/resumes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function getEvaluation(id: string): Promise<EvaluationStatus> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function getReport(id: string): Promise<Report> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/${id}/report`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function getRewrite(id: string): Promise<CvRewrite> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/${id}/rewrite`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function generateRewrite(id: string, content?: StructuredCv): Promise<CvRewrite> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/${id}/rewrite`, {
    method: "POST",
    headers: content ? { "Content-Type": "application/json" } : undefined,
    body: content ? JSON.stringify({ content }) : undefined,
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function updateRewrite(
  id: string,
  body: {
    template_id?: TemplateId;
    content?: StructuredCv;
    meta?: CvRewrite["meta"];
  },
): Promise<CvRewrite> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/${id}/rewrite`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export function exportCvUrl(id: string, format: "pdf" | "docx", template: TemplateId): string {
  return `${API_BASE}/api/v1/evaluations/${id}/export?format=${format}&template=${template}`;
}

/* --- Stubs for incomplete /edit canvas (not part of rewrite product path) --- */

export type DraftSections = {
  personal_information: string;
  summary: string;
  skills: string;
  experience: string;
  education: string;
  projects: string;
  certifications: string;
};

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

export function evaluationFileUrl(id: string): string {
  return `${API_BASE}/api/v1/evaluations/${id}/file`;
}

export async function getDraft(id: string): Promise<{
  evaluation_id: string;
  sections: DraftSections;
  overlays: PdfOverlayLine[];
  original_filename: string;
  status?: string;
  file_type?: string;
  has_file?: boolean;
}> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/${id}/draft`, { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function saveDraft(
  id: string,
  sections: DraftSections,
  overlays?: PdfOverlayLine[],
): Promise<{ sections: DraftSections; overlays: PdfOverlayLine[] }> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/${id}/draft`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sections, overlays }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function improveDraftText(
  id: string,
  body: {
    text: string;
    instruction?: string | null;
    section?: string | null;
    finding_title?: string | null;
    finding_detail?: string | null;
  },
): Promise<{ improved: string }> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/${id}/improve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function reevaluateDraft(
  id: string,
  body?: { sections?: DraftSections; overlays?: PdfOverlayLine[]; raw_text?: string },
): Promise<{ id: string; status: string }> {
  const res = await fetch(`${API_BASE}/api/v1/evaluations/${id}/reevaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}
