import mammoth from "mammoth";
import { extractText as extractPdfText } from "unpdf";

const SECTION_HEADERS: Record<string, RegExp[]> = {
  personal_information: [/personal\s+information/i, /^contact$/i, /^profile$/i],
  summary: [/summary/i, /professional\s+summary/i, /objective/i, /about\s+me/i],
  skills: [/skills/i, /technical\s+skills/i, /core\s+competencies/i],
  experience: [/experience/i, /work\s+experience/i, /employment/i, /professional\s+experience/i],
  education: [/education/i, /academic/i],
  projects: [/projects/i, /personal\s+projects/i],
  certifications: [/certifications?/i, /certificates?/i, /licenses?/i],
};

function matchHeader(line: string): string | null {
  const cleaned = line.trim().toLowerCase().replace(/:$/, "");
  if (cleaned.length > 48) return null;
  for (const [key, patterns] of Object.entries(SECTION_HEADERS)) {
    for (const p of patterns) {
      if (new RegExp(`^${p.source}$`, "i").test(cleaned)) return key;
    }
  }
  return null;
}

export async function extractText(buffer: Buffer, fileType: "pdf" | "docx"): Promise<string> {
  if (fileType === "pdf") {
    const result = await extractPdfText(new Uint8Array(buffer));
    const text = Array.isArray(result.text) ? result.text.join("\n") : String(result.text ?? "");
    return text.trim();
  }
  const result = await mammoth.extractRawText({ buffer });
  return (result.value || "").trim();
}

export function parseSections(rawText: string): Record<string, unknown> {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim());
  const headerPositions: { index: number; key: string }[] = [];
  lines.forEach((line, index) => {
    const key = matchHeader(line);
    if (key) headerPositions.push({ index, key });
  });

  const sections: Record<string, unknown> = {
    personal_information: null,
    summary: null,
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
  };

  if (!headerPositions.length) {
    sections.summary = lines.slice(0, 12).join("\n").trim() || null;
    return sections;
  }

  const preamble = lines.slice(0, headerPositions[0].index).join("\n").trim();
  if (preamble) sections.personal_information = { raw: preamble };

  headerPositions.forEach((h, idx) => {
    const end = idx + 1 < headerPositions.length ? headerPositions[idx + 1].index : lines.length;
    const bodyLines = lines.slice(h.index + 1, end).filter(Boolean);
    const body = bodyLines.join("\n").trim();

    if (h.key === "skills") {
      sections.skills = body
        .split(/[,|•·\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (h.key === "summary") {
      sections.summary = body || null;
    } else if (h.key === "personal_information") {
      sections.personal_information = { raw: body };
    } else if (["experience", "education", "projects", "certifications"].includes(h.key)) {
      sections[h.key] = bodyLines.map((b) => ({ raw: b.replace(/^[-*•]\s*/, "") }));
    } else {
      sections[h.key] = body;
    }
  });

  return sections;
}
