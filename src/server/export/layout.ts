import type { BodySectionId, StructuredCv } from "@/lib/cv-types";
import {
  layoutSplitFromKind,
  presentByColumn,
  presentSectionsInOrder,
  sectionLabel,
  type LayoutSplit,
} from "@/lib/section-order";
import type { TemplateKind } from "@/lib/templates";
import { stripHtml } from "@/lib/text-format";

export type ExportLayoutMode = "classic" | "sidebar" | "banner" | "frame";

/** Map editor template kinds to export layout families (matches DirectEditCvPreview chrome). */
export function exportModeFromKind(kind: TemplateKind): ExportLayoutMode {
  if (kind === "sidebar" || kind === "magazine") return "sidebar";
  if (kind === "aurora" || kind === "folio" || kind === "spotlight") return "banner";
  if (kind === "frame") return "frame";
  // classic | compact | executive | timeline | cards | ribbon | crest | portrait | medallion
  return "classic";
}

export function exportSplitForKind(kind: TemplateKind): LayoutSplit {
  return layoutSplitFromKind(kind);
}

export function orderedSections(cv: StructuredCv): BodySectionId[] {
  return presentSectionsInOrder(cv);
}

export function columnsForExport(cv: StructuredCv, kind: TemplateKind) {
  return presentByColumn(cv, exportSplitForKind(kind));
}

export function labelFor(id: BodySectionId): string {
  if (id === "summary") return "Professional Summary";
  return sectionLabel(id);
}

export function listText(cv: StructuredCv, id: BodySectionId): string {
  switch (id) {
    case "skills":
      return cv.skills.map(stripHtml).filter(Boolean).join(" · ");
    case "certifications":
      return cv.certifications.map(stripHtml).filter(Boolean).join(" · ");
    case "languages":
      return (cv.languages ?? []).map(stripHtml).filter(Boolean).join(" · ");
    case "awards":
      return (cv.awards ?? []).map(stripHtml).filter(Boolean).join(" · ");
    case "interests":
      return (cv.interests ?? []).map(stripHtml).filter(Boolean).join(" · ");
    default:
      return "";
  }
}

export function isListSection(id: BodySectionId): boolean {
  return (
    id === "skills" ||
    id === "certifications" ||
    id === "languages" ||
    id === "awards" ||
    id === "interests"
  );
}

/** Plain text for PDF/DOCX body lines (strips editor HTML formatting). */
export function exportPlain(value: string | undefined | null): string {
  return stripHtml(value || "");
}
