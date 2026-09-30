import type { StructuredCv } from "@/lib/cv-types";

/** Flatten structured CV into plain text for scoring / re-evaluate. */
export function structuredCvToRawText(cv: StructuredCv): string {
  const lines: string[] = [];
  const p = cv.personal;
  lines.push(p.fullName || "Candidate");
  const contact = [p.email, p.phone, p.location, ...p.links].filter(Boolean);
  if (contact.length) lines.push(contact.join(" · "));
  if (cv.summary.trim()) {
    lines.push("", "SUMMARY", cv.summary.trim());
  }
  if (cv.skills.length) {
    lines.push("", "SKILLS", cv.skills.join(", "));
  }
  if (cv.experience.length) {
    lines.push("", "EXPERIENCE");
    for (const job of cv.experience) {
      lines.push(
        [job.title, job.company].filter(Boolean).join(" — "),
        [job.start, job.end, job.location].filter(Boolean).join(" · "),
      );
      for (const b of job.bullets) {
        if (b.trim()) lines.push(`• ${b.trim()}`);
      }
    }
  }
  if (cv.education.length) {
    lines.push("", "EDUCATION");
    for (const ed of cv.education) {
      lines.push([ed.degree, ed.school, ed.year].filter(Boolean).join(" · "));
      if (ed.details?.trim()) lines.push(ed.details.trim());
    }
  }
  if (cv.projects.length) {
    lines.push("", "PROJECTS");
    for (const proj of cv.projects) {
      lines.push(proj.name);
      if (proj.description.trim()) lines.push(proj.description.trim());
      for (const b of proj.bullets || []) {
        if (b.trim()) lines.push(`• ${b.trim()}`);
      }
    }
  }
  if (cv.certifications.length) {
    lines.push("", "CERTIFICATIONS", cv.certifications.join(", "));
  }
  if (cv.languages?.length) {
    lines.push("", "LANGUAGES", cv.languages.join(", "));
  }
  if (cv.awards?.length) {
    lines.push("", "AWARDS", cv.awards.join(", "));
  }
  if (cv.interests?.length) {
    lines.push("", "INTERESTS", cv.interests.join(", "));
  }
  return lines.join("\n").trim();
}
