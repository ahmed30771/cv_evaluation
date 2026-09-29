export type Scores = {
  overall: number;
  ats: number;
  experience: number;
  skills: number;
  content: number;
  formatting: number;
};

const WEIGHTS = {
  ats: 0.2,
  experience: 0.25,
  skills: 0.2,
  content: 0.2,
  formatting: 0.15,
} as const;

export function clampScore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function recomputeOverall(scores: Omit<Scores, "overall">): number {
  const total =
    WEIGHTS.ats * scores.ats +
    WEIGHTS.experience * scores.experience +
    WEIGHTS.skills * scores.skills +
    WEIGHTS.content * scores.content +
    WEIGHTS.formatting * scores.formatting;
  return clampScore(total);
}

function flatten(items: unknown): string[] {
  if (items == null) return [];
  if (typeof items === "string") return [items];
  if (Array.isArray(items)) return items.flatMap(flatten);
  if (typeof items === "object") return Object.values(items as object).flatMap(flatten);
  return [String(items)];
}

export function checklistSignals(rawText: string, sections: Record<string, unknown>) {
  const text = rawText || "";
  const email = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);
  const phone = /(\+?\d[\d\s().-]{7,}\d)/.test(text);
  const experienceBody = sections.experience || [];
  const hasExperience =
    Boolean(Array.isArray(experienceBody) ? experienceBody.length : experienceBody) ||
    /\b(experience|employment)\b/i.test(text);
  const hasMetrics =
    /\d/.test(flatten(experienceBody).join(" ")) || /\d+%|\b\d{2,}\b/.test(text);
  const skills = (sections.skills as unknown[]) || [];
  const hasSkills = skills.length >= 2 || /\bskills?\b/i.test(text);
  const hasEducation = Boolean(sections.education) || /\beducation\b/i.test(text);
  return { email, phone, hasExperience, hasMetrics, hasSkills, hasEducation };
}

export function applyChecklistCaps(
  scores: Scores,
  signals: ReturnType<typeof checklistSignals>,
  injectionHit: boolean,
): Scores {
  const out = { ...scores };

  if (!signals.hasExperience) out.experience = Math.min(out.experience, 45);
  else if (!signals.hasMetrics) out.experience = Math.min(out.experience, 78);

  if (!signals.hasSkills) out.skills = Math.min(out.skills, 50);

  if (!(signals.email || signals.phone)) {
    out.content = Math.min(out.content, 70);
    out.ats = Math.min(out.ats, 75);
  }

  if (!signals.hasEducation) out.content = Math.min(out.content, 80);

  const weak = !signals.hasExperience || !signals.hasSkills;
  if (weak && out.overall >= 90) {
    out.ats = Math.min(out.ats, 72);
    out.experience = Math.min(out.experience, 72);
    out.skills = Math.min(out.skills, 72);
    out.content = Math.min(out.content, 72);
    out.formatting = Math.min(out.formatting, 72);
  }

  if (injectionHit) {
    out.ats = Math.min(out.ats, 85);
    out.experience = Math.min(out.experience, 85);
    out.skills = Math.min(out.skills, 85);
    out.content = Math.min(out.content, 85);
    out.formatting = Math.min(out.formatting, 70);
  }

  out.overall = recomputeOverall(out);
  return out;
}
