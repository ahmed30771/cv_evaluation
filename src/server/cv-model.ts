import type { BodySectionId, StructuredCv, TemplateId } from "@/lib/cv-types";
import { isBodySectionId } from "@/lib/cv-types";

export type { StructuredCv, TemplateId };
export { TEMPLATE_IDS, isTemplateId } from "@/lib/cv-types";

function asString(value: unknown, max = 2000): string {
  if (value == null) return "";
  return String(value).trim().slice(0, max);
}

function asStringArray(value: unknown, maxItems = 40, maxLen = 200): string[] {
  if (!Array.isArray(value)) {
    if (typeof value === "string" && value.trim()) {
      return value
        .split(/[,;\n|]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, maxItems)
        .map((s) => s.slice(0, maxLen));
    }
    return [];
  }
  return value
    .map((v) => asString(v, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function emptyCv(): StructuredCv {
  return {
    personal: { fullName: "", email: "", phone: "", location: "", links: [] },
    summary: "",
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    languages: [],
    awards: [],
    interests: [],
  };
}

export function emptyStructuredCv(): StructuredCv {
  return emptyCv();
}

export function normalizeStructuredCv(input: unknown): StructuredCv {
  const base = emptyCv();
  if (!input || typeof input !== "object") return base;
  const raw = input as Record<string, unknown>;
  const personalRaw =
    raw.personal && typeof raw.personal === "object"
      ? (raw.personal as Record<string, unknown>)
      : {};

  const experience = Array.isArray(raw.experience)
    ? raw.experience
        .filter((row) => row && typeof row === "object")
        .map((row) => {
          const r = row as Record<string, unknown>;
          return {
            company: asString(r.company, 200),
            title: asString(r.title, 200),
            location: asString(r.location, 200) || undefined,
            start: asString(r.start, 40),
            end: asString(r.end, 40),
            bullets: asStringArray(r.bullets, 12, 400),
          };
        })
        .filter((e) => e.company || e.title || e.bullets.length)
        .slice(0, 12)
    : [];

  const education = Array.isArray(raw.education)
    ? raw.education
        .filter((row) => row && typeof row === "object")
        .map((row) => {
          const r = row as Record<string, unknown>;
          return {
            school: asString(r.school, 200),
            degree: asString(r.degree, 200),
            year: asString(r.year, 40) || undefined,
            details: asString(r.details, 500) || undefined,
          };
        })
        .filter((e) => e.school || e.degree)
        .slice(0, 8)
    : [];

  const projects = Array.isArray(raw.projects)
    ? raw.projects
        .filter((row) => row && typeof row === "object")
        .map((row) => {
          const r = row as Record<string, unknown>;
          return {
            name: asString(r.name, 200),
            description: asString(r.description, 800),
            bullets: asStringArray(r.bullets, 8, 400),
          };
        })
        .filter((p) => p.name || p.description)
        .slice(0, 8)
    : [];

  return {
    personal: {
      fullName: asString(personalRaw.fullName ?? personalRaw.full_name ?? personalRaw.name, 120),
      email: asString(personalRaw.email, 120),
      phone: asString(personalRaw.phone, 60),
      location: asString(personalRaw.location, 120),
      links: asStringArray(personalRaw.links, 8, 200),
    },
    summary: asString(raw.summary, 2500),
    skills: asStringArray(raw.skills, 40, 80),
    experience,
    education,
    projects,
    certifications: asStringArray(raw.certifications, 20, 200),
    languages: asStringArray(raw.languages, 20, 80),
    awards: asStringArray(raw.awards, 20, 200),
    interests: asStringArray(raw.interests, 20, 80),
    sectionOrder: Array.isArray(raw.sectionOrder)
      ? (raw.sectionOrder.filter(isBodySectionId) as BodySectionId[])
      : undefined,
    sectionColumns: normalizeSectionColumns(raw.sectionColumns),
  };
}

function normalizeSectionColumns(value: unknown): StructuredCv["sectionColumns"] {
  if (!value || typeof value !== "object") return undefined;
  const out: NonNullable<StructuredCv["sectionColumns"]> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!isBodySectionId(k)) continue;
    if (v === "left" || v === "right") out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Rough heuristic seed from extraction when AI rewrite is unavailable. */
export function seedFromExtraction(
  rawText: string,
  sections: Record<string, unknown>,
): StructuredCv {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const firstLine = lines[0] || "";
  const emailMatch = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = rawText.match(/(\+?\d[\d\s().-]{7,}\d)/);

  const skillsRaw = sections.skills;
  const summaryRaw = sections.summary;
  const experienceRaw = sections.experience;
  const educationRaw = sections.education;

  return normalizeStructuredCv({
    personal: {
      fullName: firstLine.slice(0, 80),
      email: emailMatch?.[0] || "",
      phone: phoneMatch?.[0] || "",
      location: "",
      links: [],
    },
    summary: typeof summaryRaw === "string" ? summaryRaw : "",
    skills: skillsRaw,
    experience:
      typeof experienceRaw === "string"
        ? [
            {
              company: "Experience",
              title: "",
              start: "",
              end: "",
              bullets: experienceRaw
                .split(/\n+/)
                .map((s) => s.replace(/^[-•*]\s*/, "").trim())
                .filter(Boolean)
                .slice(0, 8),
            },
          ]
        : [],
    education:
      typeof educationRaw === "string"
        ? [{ school: educationRaw.slice(0, 200), degree: "", year: "" }]
        : [],
    projects: [],
    certifications: sections.certifications,
  });
}
