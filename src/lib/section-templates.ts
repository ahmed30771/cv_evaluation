import type { StructuredCv } from "@/lib/cv-types";

export type SectionTemplateId =
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications"
  | "summary"
  | "languages"
  | "awards"
  | "interests";

export type SectionTemplate = {
  id: SectionTemplateId;
  label: string;
  blurb: string;
  icon: string;
};

export const SECTION_TEMPLATES: SectionTemplate[] = [
  { id: "experience", label: "Experience", blurb: "Job roles with bullets & dates", icon: "💼" },
  { id: "education", label: "Education", blurb: "Degrees, schools, years", icon: "🎓" },
  { id: "projects", label: "Projects", blurb: "Portfolio work & side projects", icon: "🛠" },
  { id: "skills", label: "Skills", blurb: "Tools, tech, strengths", icon: "⚡" },
  { id: "summary", label: "Summary", blurb: "Short professional profile", icon: "✎" },
  { id: "certifications", label: "Certifications", blurb: "Licenses & certificates", icon: "🏅" },
  { id: "languages", label: "Languages", blurb: "Spoken languages", icon: "🌐" },
  { id: "awards", label: "Awards", blurb: "Honors & recognition", icon: "★" },
  { id: "interests", label: "Interests", blurb: "Hobbies & activities", icon: "♥" },
];

/** Whether this section type already exists on the CV. */
export function sectionIsPresent(cv: StructuredCv, id: SectionTemplateId): boolean {
  switch (id) {
    case "experience":
      return cv.experience.length > 0;
    case "education":
      return cv.education.length > 0;
    case "projects":
      return cv.projects.length > 0;
    case "skills":
      return cv.skills.length > 0;
    case "summary":
      return cv.summary.trim().length > 0;
    case "certifications":
      return cv.certifications.length > 0;
    case "languages":
      return (cv.languages ?? []).length > 0;
    case "awards":
      return (cv.awards ?? []).length > 0;
    case "interests":
      return (cv.interests ?? []).length > 0;
    default:
      return false;
  }
}

/** Templates the user can still add (not yet on the resume). */
export function availableSectionTemplates(cv: StructuredCv): SectionTemplate[] {
  return SECTION_TEMPLATES.filter((tpl) => !sectionIsPresent(cv, tpl.id));
}

/** Clear an entire section type from the CV. */
export function clearSection(cv: StructuredCv, id: SectionTemplateId): StructuredCv {
  const languages = cv.languages ?? [];
  const awards = cv.awards ?? [];
  const interests = cv.interests ?? [];
  switch (id) {
    case "experience":
      return { ...cv, languages, awards, interests, experience: [] };
    case "education":
      return { ...cv, languages, awards, interests, education: [] };
    case "projects":
      return { ...cv, languages, awards, interests, projects: [] };
    case "skills":
      return { ...cv, languages, awards, interests, skills: [] };
    case "summary":
      return { ...cv, languages, awards, interests, summary: "" };
    case "certifications":
      return { ...cv, languages, awards, interests, certifications: [] };
    case "languages":
      return { ...cv, awards, interests, languages: [] };
    case "awards":
      return { ...cv, languages, interests, awards: [] };
    case "interests":
      return { ...cv, languages, awards, interests: [] };
    default:
      return { ...cv, languages, awards, interests };
  }
}

export function addSectionTemplate(cv: StructuredCv, id: SectionTemplateId): StructuredCv {
  const languages = cv.languages ?? [];
  const awards = cv.awards ?? [];
  const interests = cv.interests ?? [];

  switch (id) {
    case "experience":
      return {
        ...cv,
        languages,
        awards,
        interests,
        experience: [
          ...cv.experience,
          {
            company: "Company",
            title: "Job title",
            start: "2023",
            end: "Present",
            bullets: ["Describe a strong achievement…"],
          },
        ],
      };
    case "education":
      return {
        ...cv,
        languages,
        awards,
        interests,
        education: [...cv.education, { school: "School / University", degree: "Degree", year: "2024" }],
      };
    case "projects":
      return {
        ...cv,
        languages,
        awards,
        interests,
        projects: [
          ...cv.projects,
          { name: "Project name", description: "What you built and the impact…" },
        ],
      };
    case "skills":
      return {
        ...cv,
        languages,
        awards,
        interests,
        skills: cv.skills.length
          ? [...cv.skills, "New skill"]
          : ["Skill 1", "Skill 2", "Skill 3"],
      };
    case "summary":
      return {
        ...cv,
        languages,
        awards,
        interests,
        summary:
          cv.summary.trim() ||
          "Write a short professional summary highlighting your strengths and goals…",
      };
    case "certifications":
      return {
        ...cv,
        languages,
        awards,
        interests,
        certifications: cv.certifications.length
          ? [...cv.certifications, "New certification"]
          : ["Certification name"],
      };
    case "languages":
      return {
        ...cv,
        awards,
        interests,
        languages: languages.length ? [...languages, "Language"] : ["English", "Urdu"],
      };
    case "awards":
      return {
        ...cv,
        languages,
        interests,
        awards: awards.length ? [...awards, "Award title"] : ["Award or honor"],
      };
    case "interests":
      return {
        ...cv,
        languages,
        awards,
        interests: interests.length ? [...interests, "Interest"] : ["Interest 1", "Interest 2"],
      };
    default:
      return { ...cv, languages, awards, interests };
  }
}
