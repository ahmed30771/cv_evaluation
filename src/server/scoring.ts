import { createHash } from "crypto";

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

const SCORE_KEYS = ["ats", "experience", "skills", "content", "formatting"] as const;

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

export function normalizeScoreText(rawText: string): string {
  return rawText.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function hashScoreContent(rawText: string): string {
  return createHash("sha256").update(normalizeScoreText(rawText)).digest("hex");
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
    /\d/.test(flatten(experienceBody).join(" ")) || /\d+%|\$\d|\b\d{2,}\b/.test(text);
  const skills = Array.isArray(sections.skills) ? sections.skills : [];
  const hasSkills = skills.length >= 2 || /\bskills?\b/i.test(text);
  const hasEducation = Boolean(sections.education) || /\beducation\b/i.test(text);
  const hasSummary =
    Boolean(sections.summary) || /\b(summary|objective|profile)\b/i.test(text);
  const hasProjects =
    (Array.isArray(sections.projects) && sections.projects.length > 0) || /\bprojects?\b/i.test(text);
  return { email, phone, hasExperience, hasMetrics, hasSkills, hasEducation, hasSummary, hasProjects };
}

function countMatches(text: string, re: RegExp): number {
  return (text.match(re) || []).length;
}

/** Deterministic rubric so the same CV text yields the same base scores. */
export function computeHeuristicScores(
  rawText: string,
  sections: Record<string, unknown>,
): Scores {
  const text = rawText || "";
  const signals = checklistSignals(text, sections);
  const words = text.split(/\s+/).filter(Boolean).length;
  const bullets = countMatches(text, /(^|\n)\s*[•\-*]\s+/g);
  const metrics = countMatches(text, /\d+%|\$\d[\d,]*(?:\.\d+)?|\b\d{2,}\b/g);
  const skillCount = Array.isArray(sections.skills) ? sections.skills.length : 0;
  const expLines = Array.isArray(sections.experience) ? sections.experience.length : 0;
  const standardHeaders = countMatches(
    text,
    /\b(SUMMARY|PROFESSIONAL SUMMARY|SKILLS|EXPERIENCE|WORK EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS)\b/gi,
  );

  let ats = 52;
  if (signals.email) ats += 8;
  if (signals.phone) ats += 5;
  if (standardHeaders >= 3) ats += 12;
  else if (standardHeaders >= 1) ats += 6;
  if (skillCount >= 5) ats += 8;
  if (skillCount >= 8) ats += 5;
  if (bullets >= 3) ats += 5;

  let experience = 42;
  if (signals.hasExperience) experience += 16;
  if (expLines >= 4) experience += 8;
  if (expLines >= 8) experience += 6;
  if (signals.hasMetrics) experience += 12;
  if (metrics >= 3) experience += 8;
  if (metrics >= 6) experience += 4;
  if (bullets >= 4) experience += 6;

  let skillsScore = 40;
  if (signals.hasSkills) skillsScore += 14;
  if (skillCount >= 4) skillsScore += 12;
  if (skillCount >= 7) skillsScore += 10;
  if (skillCount >= 10) skillsScore += 6;
  if (signals.hasExperience && skillCount >= 4) skillsScore += 6;

  let content = 44;
  if (signals.hasSummary) content += 12;
  if (signals.hasEducation) content += 10;
  if (signals.hasProjects) content += 8;
  if (words >= 180) content += 8;
  if (words >= 320) content += 6;
  if (words >= 500) content += 4;
  if (Array.isArray(sections.certifications) && sections.certifications.length) content += 4;

  let formatting = 48;
  if (bullets >= 3) formatting += 12;
  if (bullets >= 6) formatting += 6;
  if (words >= 150 && words <= 1000) formatting += 14;
  else if (words > 1000) formatting += 4;
  if (standardHeaders >= 3) formatting += 10;
  if (!/\t{2,}| {8,}/.test(text)) formatting += 4;

  const out: Scores = {
    ats: clampScore(ats),
    experience: clampScore(experience),
    skills: clampScore(skillsScore),
    content: clampScore(content),
    formatting: clampScore(formatting),
    overall: 0,
  };
  out.overall = recomputeOverall(out);
  return out;
}

/** Blend LLM judgment with heuristics so scores stay stable and fair. */
export function blendScores(llm: Scores, heuristic: Scores): Scores {
  const out: Scores = {
    ats: 0,
    experience: 0,
    skills: 0,
    content: 0,
    formatting: 0,
    overall: 0,
  };
  for (const key of SCORE_KEYS) {
    const mixed = 0.58 * heuristic[key] + 0.42 * llm[key];
    // Keep LLM from swinging more than ±10 away from the deterministic base.
    const bounded = Math.max(heuristic[key] - 10, Math.min(heuristic[key] + 10, mixed));
    out[key] = clampScore(bounded);
  }
  out.overall = recomputeOverall(out);
  return out;
}

/** Soften random score drops when re-scoring similar / improved drafts. */
export function dampenScoreRegression(next: Scores, previous: Scores | null): Scores {
  if (!previous) return next;
  const out = { ...next };
  for (const key of SCORE_KEYS) {
    if (out[key] < previous[key] - 12) {
      out[key] = clampScore(Math.round((out[key] * 0.4 + previous[key] * 0.6)));
    }
  }
  out.overall = recomputeOverall(out);
  return out;
}

export function applyChecklistCaps(
  scores: Scores,
  signals: ReturnType<typeof checklistSignals>,
  injectionHit: boolean,
): Scores {
  const out = { ...scores };

  if (!signals.hasExperience) out.experience = Math.min(out.experience, 45);
  else if (!signals.hasMetrics) out.experience = Math.min(out.experience, 82);

  if (!signals.hasSkills) out.skills = Math.min(out.skills, 50);

  if (!(signals.email || signals.phone)) {
    out.content = Math.min(out.content, 70);
    out.ats = Math.min(out.ats, 75);
  }

  if (!signals.hasEducation) out.content = Math.min(out.content, 82);

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

export function finalizeScores(opts: {
  llm: Scores;
  rawText: string;
  sections: Record<string, unknown>;
  injectionHit: boolean;
  previous?: Scores | null;
}): Scores {
  const heuristic = computeHeuristicScores(opts.rawText, opts.sections);
  const blended = blendScores(opts.llm, heuristic);
  const capped = applyChecklistCaps(blended, checklistSignals(opts.rawText, opts.sections), opts.injectionHit);
  return dampenScoreRegression(capped, opts.previous ?? null);
}
