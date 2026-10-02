import type { StructuredCv } from "@/lib/cv-types";
import { stripHtml } from "@/lib/text-format";

function t(value: string | undefined | null): string {
  return stripHtml(value || "").trim();
}

/** Flatten structured CV into plain text for scoring / re-evaluate. */
export function structuredCvToRawText(cv: StructuredCv): string {
  const lines: string[] = [];
  const p = cv.personal;
  lines.push(t(p.fullName) || "Candidate");
  const contact = [p.email, p.phone, p.location, ...p.links].map(t).filter(Boolean);
  if (contact.length) lines.push(contact.join(" · "));
  if (t(cv.summary)) {
    lines.push("", "PROFESSIONAL SUMMARY", t(cv.summary));
  }
  if (cv.skills.length) {
    lines.push("", "SKILLS", cv.skills.map(t).filter(Boolean).join(", "));
  }
  if (cv.experience.length) {
    lines.push("", "EXPERIENCE");
    for (const job of cv.experience) {
      lines.push(
        [t(job.title), t(job.company)].filter(Boolean).join(" — "),
        [t(job.start), t(job.end), t(job.location)].filter(Boolean).join(" · "),
      );
      for (const b of job.bullets) {
        if (t(b)) lines.push(`• ${t(b)}`);
      }
    }
  }
  if (cv.education.length) {
    lines.push("", "EDUCATION");
    for (const ed of cv.education) {
      lines.push([t(ed.degree), t(ed.school), t(ed.year)].filter(Boolean).join(" · "));
      if (t(ed.details)) lines.push(t(ed.details));
    }
  }
  if (cv.projects.length) {
    lines.push("", "PROJECTS");
    for (const proj of cv.projects) {
      lines.push(t(proj.name));
      if (t(proj.description)) lines.push(t(proj.description));
      for (const b of proj.bullets || []) {
        if (t(b)) lines.push(`• ${t(b)}`);
      }
    }
  }
  if (cv.certifications.length) {
    lines.push("", "CERTIFICATIONS", cv.certifications.map(t).filter(Boolean).join(", "));
  }
  if (cv.languages?.length) {
    lines.push("", "LANGUAGES", cv.languages.map(t).filter(Boolean).join(", "));
  }
  if (cv.awards?.length) {
    lines.push("", "AWARDS", cv.awards.map(t).filter(Boolean).join(", "));
  }
  if (cv.interests?.length) {
    lines.push("", "INTERESTS", cv.interests.map(t).filter(Boolean).join(", "));
  }
  return lines.join("\n").trim();
}
