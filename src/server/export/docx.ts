import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { StructuredCv } from "@/lib/cv-types";
import type { TemplateId } from "@/lib/cv-types";
import { getTheme } from "@/lib/templates";

function contactLine(cv: StructuredCv): string {
  return [cv.personal.email, cv.personal.phone, cv.personal.location, ...cv.personal.links]
    .filter(Boolean)
    .join(" · ");
}

function heading(text: string, size = 24, color?: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size, font: "Calibri", color: color?.replace("#", "") }),
    ],
  });
}

function body(text: string, opts?: { bold?: boolean; size?: number; color?: string }): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        size: opts?.size ?? 20,
        font: "Calibri",
        color: opts?.color?.replace("#", ""),
      }),
    ],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: 20, font: "Calibri" })],
  });
}

function sectionBlocks(cv: StructuredCv, compact: boolean): Paragraph[] {
  const gap = compact ? 40 : 80;
  const out: Paragraph[] = [];

  if (cv.summary) {
    out.push(heading("Professional Summary", compact ? 22 : 24));
    out.push(
      new Paragraph({
        spacing: { after: gap },
        children: [new TextRun({ text: cv.summary, size: compact ? 18 : 20, font: "Calibri" })],
      }),
    );
  }

  if (cv.skills.length) {
    out.push(heading("Skills", compact ? 22 : 24));
    out.push(body(cv.skills.join(" · "), { size: compact ? 18 : 20 }));
  }

  if (cv.experience.length) {
    out.push(heading("Experience", compact ? 22 : 24));
    for (const job of cv.experience) {
      const titleLine = [job.title, job.company].filter(Boolean).join(" — ");
      const dates = [job.start, job.end].filter(Boolean).join(" – ");
      out.push(body(titleLine, { bold: true, size: compact ? 18 : 20 }));
      if (dates || job.location) {
        out.push(body([dates, job.location].filter(Boolean).join(" · "), { size: compact ? 17 : 18 }));
      }
      for (const b of job.bullets) out.push(bullet(b));
    }
  }

  if (cv.education.length) {
    out.push(heading("Education", compact ? 22 : 24));
    for (const ed of cv.education) {
      out.push(body([ed.degree, ed.school].filter(Boolean).join(" — "), { bold: true }));
      if (ed.year || ed.details) out.push(body([ed.year, ed.details].filter(Boolean).join(" · ")));
    }
  }

  if (cv.projects.length) {
    out.push(heading("Projects", compact ? 22 : 24));
    for (const p of cv.projects) {
      out.push(body(p.name, { bold: true }));
      if (p.description) out.push(body(p.description));
      for (const b of p.bullets || []) out.push(bullet(b));
    }
  }

  if (cv.certifications.length) {
    out.push(heading("Certifications", compact ? 22 : 24));
    out.push(body(cv.certifications.join(" · ")));
  }

  return out;
}

function headerParas(cv: StructuredCv, accent = false, color = "1A4F7A"): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: cv.personal.fullName || "Resume",
          bold: true,
          size: accent ? 36 : 32,
          font: "Calibri",
          color: accent ? color.replace("#", "") : "111111",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new TextRun({ text: contactLine(cv), size: 18, font: "Calibri", color: "444444" })],
    }),
  ];
}

function cellParas(paras: Paragraph[]): TableCell {
  return new TableCell({
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    width: { size: 50, type: WidthType.PERCENTAGE },
    children: paras.length ? paras : [new Paragraph({ children: [] })],
  });
}

function sidebarDoc(cv: StructuredCv): Document {
  const left: Paragraph[] = [
    body("Contact", { bold: true }),
    body(cv.personal.email),
    body(cv.personal.phone),
    body(cv.personal.location),
    ...cv.personal.links.map((l) => body(l)),
    new Paragraph({ spacing: { before: 160 }, children: [] }),
    body("Skills", { bold: true }),
    ...cv.skills.map((s) => bullet(s)),
    ...(cv.certifications.length
      ? [new Paragraph({ spacing: { before: 120 }, children: [] }), body("Certifications", { bold: true }), body(cv.certifications.join(", "))]
      : []),
  ];

  const right: Paragraph[] = [];
  if (cv.summary) {
    right.push(heading("Summary"));
    right.push(body(cv.summary));
  }
  if (cv.experience.length) {
    right.push(heading("Experience"));
    for (const job of cv.experience) {
      right.push(body([job.title, job.company].filter(Boolean).join(" — "), { bold: true }));
      right.push(body([job.start, job.end].filter(Boolean).join(" – ")));
      for (const b of job.bullets) right.push(bullet(b));
    }
  }
  if (cv.education.length) {
    right.push(heading("Education"));
    for (const ed of cv.education) {
      right.push(body([ed.degree, ed.school].filter(Boolean).join(" — "), { bold: true }));
      if (ed.year) right.push(body(ed.year));
    }
  }
  if (cv.projects.length) {
    right.push(heading("Projects"));
    for (const p of cv.projects) {
      right.push(body(p.name, { bold: true }));
      if (p.description) right.push(body(p.description));
    }
  }

  return new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 540, bottom: 540, left: 540, right: 540 } },
        },
        children: [
          ...headerParas(cv),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [3500, 6500],
            rows: [
              new TableRow({
                children: [cellParas(left), cellParas(right)],
              }),
            ],
          }),
        ],
      },
    ],
  });
}

function splitDoc(cv: StructuredCv): Document {
  const left: Paragraph[] = [];
  if (cv.skills.length) {
    left.push(heading("Skills"));
    left.push(body(cv.skills.join(" · ")));
  }
  if (cv.education.length) {
    left.push(heading("Education"));
    for (const ed of cv.education) {
      left.push(body([ed.degree, ed.school].filter(Boolean).join(" — "), { bold: true }));
      if (ed.year) left.push(body(ed.year));
    }
  }
  if (cv.certifications.length) {
    left.push(heading("Certifications"));
    left.push(body(cv.certifications.join(" · ")));
  }

  const right: Paragraph[] = [];
  if (cv.summary) {
    right.push(heading("Summary"));
    right.push(body(cv.summary));
  }
  if (cv.experience.length) {
    right.push(heading("Experience"));
    for (const job of cv.experience) {
      right.push(body([job.title, job.company].filter(Boolean).join(" — "), { bold: true }));
      right.push(body([job.start, job.end].filter(Boolean).join(" – ")));
      for (const b of job.bullets) right.push(bullet(b));
    }
  }
  if (cv.projects.length) {
    right.push(heading("Projects"));
    for (const p of cv.projects) {
      right.push(body(p.name, { bold: true }));
      if (p.description) right.push(body(p.description));
    }
  }

  return new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 540, bottom: 540, left: 540, right: 540 } },
        },
        children: [
          ...headerParas(cv, true),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [4500, 5500],
            rows: [new TableRow({ children: [cellParas(left), cellParas(right)] })],
          }),
        ],
      },
    ],
  });
}

export async function buildDocx(cv: StructuredCv, templateId: TemplateId): Promise<Buffer> {
  const theme = getTheme(templateId);
  let doc: Document;
  if (theme.kind === "sidebar" || theme.kind === "magazine") doc = sidebarDoc(cv);
  else if (theme.kind === "banner" || theme.kind === "aurora") doc = splitDoc(cv);
  else {
    doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: theme.kind === "compact" ? 420 : 720,
                bottom: theme.kind === "compact" ? 420 : 720,
                left: theme.kind === "compact" ? 540 : 720,
                right: theme.kind === "compact" ? 540 : 720,
              },
            },
          },
          children: [
            ...headerParas(cv, true, theme.accent),
            ...sectionBlocks(cv, theme.kind === "compact"),
          ],
        },
      ],
    });
  }
  const ab = await Packer.toBuffer(doc);
  return Buffer.from(ab);
}
