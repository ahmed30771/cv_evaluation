// Empty = same origin (Vercel single project). Local: set NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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
