import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  VerticalAlign,
} from "docx";
import type { BodySectionId, StructuredCv, TemplateId } from "@/lib/cv-types";
import { resolveTheme, type CustomColorPalette } from "@/lib/templates";
import {
  columnsForExport,
  exportModeFromKind,
  isListSection,
  labelFor,
  listText,
  orderedSections,
} from "@/server/export/layout";

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
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size,
        font: "Calibri",
        color: color?.replace("#", ""),
      }),
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

function bullet(text: string, color?: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: 20, font: "Calibri", color: color?.replace("#", "") })],
  });
}

function sectionParas(
  cv: StructuredCv,
  id: BodySectionId,
  compact: boolean,
  accent?: string,
  textColor?: string,
): Paragraph[] {
  const out: Paragraph[] = [];
  const hSize = compact ? 22 : 24;
  const bSize = compact ? 18 : 20;
  const ink = textColor;

  if (id === "summary") {
    if (!cv.summary) return out;
    out.push(heading(labelFor(id), hSize, accent));
    out.push(
      new Paragraph({
        spacing: { after: compact ? 40 : 80 },
        children: [new TextRun({ text: cv.summary, size: bSize, font: "Calibri", color: ink?.replace("#", "") })],
      }),
    );
    return out;
  }

  if (isListSection(id)) {
    const text = listText(cv, id);
    if (!text) return out;
    out.push(heading(labelFor(id), hSize, accent));
    out.push(body(text, { size: bSize, color: ink }));
    return out;
  }

  if (id === "experience") {
    if (!cv.experience.length) return out;
    out.push(heading(labelFor(id), hSize, accent));
    for (const job of cv.experience) {
      out.push(
        body([job.title, job.company].filter(Boolean).join(" — "), { bold: true, size: bSize, color: ink }),
      );
      const dates = [job.start, job.end].filter(Boolean).join(" – ");
      if (dates || job.location) {
        out.push(body([dates, job.location].filter(Boolean).join(" · "), { size: compact ? 17 : 18, color: ink }));
      }
      for (const b of job.bullets) out.push(bullet(b, ink));
    }
    return out;
  }

  if (id === "education") {
    if (!cv.education.length) return out;
    out.push(heading(labelFor(id), hSize, accent));
    for (const ed of cv.education) {
      out.push(body([ed.degree, ed.school].filter(Boolean).join(" — "), { bold: true, color: ink }));
      if (ed.year || ed.details) out.push(body([ed.year, ed.details].filter(Boolean).join(" · "), { color: ink }));
    }
    return out;
  }

  if (id === "projects") {
    if (!cv.projects.length) return out;
    out.push(heading(labelFor(id), hSize, accent));
    for (const p of cv.projects) {
      out.push(body(p.name, { bold: true, color: ink }));
      if (p.description) out.push(body(p.description, { color: ink }));
      for (const b of p.bullets || []) out.push(bullet(b, ink));
    }
    return out;
  }

  return out;
}

function sectionsParas(
  cv: StructuredCv,
  ids: BodySectionId[],
  compact: boolean,
  accent?: string,
  textColor?: string,
): Paragraph[] {
  return ids.flatMap((id) => sectionParas(cv, id, compact, accent, textColor));
}

function headerParas(
  cv: StructuredCv,
  opts?: { accent?: boolean; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] },
): Paragraph[] {
  const align = opts?.align ?? AlignmentType.CENTER;
  return [
    new Paragraph({
      alignment: align,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: cv.personal.fullName || "Resume",
          bold: true,
          size: opts?.accent ? 36 : 32,
          font: "Calibri",
          color: opts?.accent ? (opts.color || "1A4F7A").replace("#", "") : "111111",
        }),
      ],
    }),
    new Paragraph({
      alignment: align,
      spacing: { after: 160 },
      children: [new TextRun({ text: contactLine(cv), size: 18, font: "Calibri", color: "444444" })],
    }),
  ];
}

function cellParas(
  paras: Paragraph[],
  widthPct: number,
  opts?: { fill?: string },
): TableCell {
  return new TableCell({
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.TOP,
    shading: opts?.fill
      ? { type: ShadingType.CLEAR, fill: opts.fill.replace("#", "") }
      : undefined,
    children: paras.length ? paras : [new Paragraph({ children: [] })],
  });
}

function sidebarDoc(cv: StructuredCv, theme: { accent: string; railBg: string; railText: string }, magazine: boolean): Document {
  const { left, right } = columnsForExport(cv, magazine ? "magazine" : "sidebar");
  const railColor = theme.railText.replace("#", "");
  const railFill = magazine ? theme.accent : theme.railBg;
  const rail: Paragraph[] = [
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: cv.personal.fullName || "Resume",
          bold: true,
          size: 28,
          font: "Calibri",
          color: railColor,
        }),
      ],
    }),
    ...(cv.personal.email ? [body(cv.personal.email, { color: railColor })] : []),
    ...(cv.personal.phone ? [body(cv.personal.phone, { color: railColor })] : []),
    ...(cv.personal.location ? [body(cv.personal.location, { color: railColor })] : []),
    ...cv.personal.links.map((l) => body(l, { color: railColor })),
    new Paragraph({ spacing: { before: 120 }, children: [] }),
    ...sectionsParas(cv, left, false, theme.railText, theme.railText),
  ];

  return new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 0, bottom: 0, left: 0, right: 0 } },
        },
        children: [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: magazine ? [2800, 7200] : [3400, 6600],
            rows: [
              new TableRow({
                children: [
                  cellParas(rail, magazine ? 28 : 34, { fill: railFill }),
                  cellParas(
                    [
                      new Paragraph({ spacing: { before: 200 }, children: [] }),
                      ...sectionsParas(cv, right, false, theme.accent),
                    ],
                    magazine ? 72 : 66,
                    { fill: "FFFFFF" },
                  ),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });
}

function splitDoc(cv: StructuredCv, accent: string, kind: "folio" | "aurora"): Document {
  const { left, right } = columnsForExport(cv, kind);
  return new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 540, bottom: 540, left: 540, right: 540 } },
        },
        children: [
          ...headerParas(cv, { accent: true, color: accent }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [5000, 5000],
            rows: [
              new TableRow({
                children: [
                  cellParas(sectionsParas(cv, left, false, accent), 50),
                  cellParas(sectionsParas(cv, right, false, accent), 50),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });
}

export async function buildDocx(
  cv: StructuredCv,
  templateId: TemplateId,
  colorThemeId?: string | null,
  customThemes?: CustomColorPalette[] | null,
): Promise<Buffer> {
  const theme = resolveTheme(templateId, colorThemeId, customThemes);
  const mode = exportModeFromKind(theme.kind);
  const compact = theme.kind === "compact";
  let doc: Document;

  if (mode === "sidebar") {
    doc = sidebarDoc(cv, theme, theme.kind === "magazine");
  } else if (mode === "banner") {
    doc = splitDoc(cv, theme.accent, theme.kind === "aurora" ? "aurora" : "folio");
  } else {
    doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: compact ? 420 : 720,
                bottom: compact ? 420 : 720,
                left: compact ? 540 : theme.kind === "frame" ? 640 : 720,
                right: compact ? 540 : theme.kind === "frame" ? 640 : 720,
              },
            },
          },
          children: [
            ...headerParas(cv, {
              accent: true,
              color: theme.accent,
              align: theme.kind === "executive" ? AlignmentType.LEFT : AlignmentType.CENTER,
            }),
            ...sectionsParas(cv, orderedSections(cv), compact, theme.accent),
          ],
        },
      ],
    });
  }

  const ab = await Packer.toBuffer(doc);
  return Buffer.from(ab);
}
