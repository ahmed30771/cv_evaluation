import type { PdfOverlayLine } from "@/lib/api";

export const SECTION_LABELS: Record<string, string> = {
  personal_information: "Personal",
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  certifications: "Certifications",
};

export function assignSectionsToLines(lines: PdfOverlayLine[]): PdfOverlayLine[] {
  return lines;
}

export function sectionBounds(
  lines: PdfOverlayLine[],
  section?: string,
  page?: number,
): { left: number; top: number; width: number; height: number } | undefined {
  const filtered = lines.filter((l) => {
    if (section && l.section !== section) return false;
    if (page != null && l.page !== page) return false;
    return true;
  });
  if (!filtered.length) return undefined;
  let minY = Infinity;
  let maxY = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const line of filtered) {
    minY = Math.min(minY, line.y);
    maxY = Math.max(maxY, line.y + line.h);
    minX = Math.min(minX, line.x);
    maxX = Math.max(maxX, line.x + line.w);
  }
  return { left: minX, top: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) };
}
