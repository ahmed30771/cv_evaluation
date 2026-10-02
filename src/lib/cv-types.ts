export const TEMPLATE_IDS = [
  "classic",
  "compact",
  "executive",
  "timeline",
  "sidebar",
  "frame",
  "magazine",
  "ocean",
  "forest",
  "indigo",
  "sunset",
  "aurora",
  "portrait",
  "spotlight",
  "medallion",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && (TEMPLATE_IDS as readonly string[]).includes(value);
}

export type StructuredCv = {
  personal: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    links: string[];
    /** Optional profile photo as a data URL (jpeg/png/webp). Omitted when unused. */
    photo?: string;
    /** Optional hyperlink overrides (display text stays in the fields above). */
    hrefs?: {
      email?: string;
      phone?: string;
      location?: string;
      /** Parallel to `links` — empty/omitted means auto-detect from the link text. */
      links?: string[];
    };
  };
  summary: string;
  skills: string[];
  experience: Array<{
    company: string;
    title: string;
    location?: string;
    start: string;
    end: string;
    bullets: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    year?: string;
    details?: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    bullets?: string[];
  }>;
  certifications: string[];
  languages: string[];
  awards: string[];
  interests: string[];
  /** Display order for body sections (personal/header excluded). */
  sectionOrder?: BodySectionId[];
  /** Column placement for two-column layouts / editor split. */
  sectionColumns?: Partial<Record<BodySectionId, "left" | "right">>;
};

export type BodySectionId =
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "projects"
  | "certifications"
  | "languages"
  | "awards"
  | "interests";

export const DEFAULT_SECTION_ORDER: BodySectionId[] = [
  "summary",
  "skills",
  "experience",
  "education",
  "projects",
  "certifications",
  "languages",
  "awards",
  "interests",
];

export function isBodySectionId(value: unknown): value is BodySectionId {
  return typeof value === "string" && (DEFAULT_SECTION_ORDER as readonly string[]).includes(value);
}
