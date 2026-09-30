import type { BodySectionId, StructuredCv } from "@/lib/cv-types";
import { DEFAULT_SECTION_ORDER, isBodySectionId } from "@/lib/cv-types";
import { sectionIsPresent, type SectionTemplateId } from "@/lib/section-templates";

export { DEFAULT_SECTION_ORDER };

export type SectionColumn = "left" | "right";
export type LayoutSplit = "single" | "aurora" | "banner" | "sidebar";

const SECTION_LABELS: Record<BodySectionId, string> = {
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  certifications: "Certifications",
  languages: "Languages",
  awards: "Awards",
  interests: "Interests",
};

const DEFAULT_SPLIT: Record<LayoutSplit, Partial<Record<BodySectionId, SectionColumn>>> = {
  single: {},
  aurora: {
    summary: "left",
    skills: "left",
    education: "left",
    certifications: "left",
    languages: "left",
    awards: "left",
    interests: "left",
    experience: "right",
    projects: "right",
  },
  banner: {
    summary: "left",
    experience: "left",
    projects: "left",
    skills: "right",
    education: "right",
    certifications: "right",
    languages: "right",
    awards: "right",
    interests: "right",
  },
  sidebar: {
    skills: "left",
    certifications: "left",
    languages: "left",
    summary: "right",
    experience: "right",
    education: "right",
    projects: "right",
    awards: "right",
    interests: "right",
  },
};

export function sectionLabel(id: BodySectionId): string {
  return SECTION_LABELS[id];
}

/** Full order with any missing ids appended (defaults preserved). */
export function resolveSectionOrder(cv: StructuredCv): BodySectionId[] {
  const raw = Array.isArray(cv.sectionOrder) ? cv.sectionOrder.filter(isBodySectionId) : [];
  const seen = new Set<BodySectionId>();
  const out: BodySectionId[] = [];
  for (const id of raw) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  for (const id of DEFAULT_SECTION_ORDER) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

/** Only sections that currently have content, in display order. */
export function presentSectionsInOrder(cv: StructuredCv): BodySectionId[] {
  return resolveSectionOrder(cv).filter((id) => sectionIsPresent(cv, id as SectionTemplateId));
}

export function resolveSectionColumn(
  cv: StructuredCv,
  id: BodySectionId,
  split: LayoutSplit = "single",
): SectionColumn {
  const override = cv.sectionColumns?.[id];
  if (override === "left" || override === "right") return override;
  const def = DEFAULT_SPLIT[split][id];
  return def || "left";
}

export function presentByColumn(
  cv: StructuredCv,
  split: LayoutSplit,
): { left: BodySectionId[]; right: BodySectionId[] } {
  const left: BodySectionId[] = [];
  const right: BodySectionId[] = [];
  for (const id of presentSectionsInOrder(cv)) {
    if (resolveSectionColumn(cv, id, split) === "right") right.push(id);
    else left.push(id);
  }
  return { left, right };
}

export function moveSectionOrder(
  cv: StructuredCv,
  sectionId: BodySectionId,
  direction: "up" | "down",
  split: LayoutSplit = "single",
): StructuredCv {
  const { left, right } = presentByColumn(cv, split);
  const col = resolveSectionColumn(cv, sectionId, split);
  const lane = col === "right" ? right : left;
  const idx = lane.indexOf(sectionId);
  if (idx < 0) return cv;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= lane.length) return cv;

  const nextLane = [...lane];
  [nextLane[idx], nextLane[swapWith]] = [nextLane[swapWith], nextLane[idx]];

  const other = col === "right" ? left : right;
  const merged = col === "right" ? [...other, ...nextLane] : [...nextLane, ...other];
  const full = resolveSectionOrder(cv);
  const absent = full.filter((id) => !merged.includes(id));
  return { ...cv, sectionOrder: [...merged, ...absent] };
}

export function moveSectionColumn(
  cv: StructuredCv,
  sectionId: BodySectionId,
  column: SectionColumn,
  split: LayoutSplit = "single",
): StructuredCv {
  const current = resolveSectionColumn(cv, sectionId, split);
  if (current === column) return cv;
  const columns = { ...(cv.sectionColumns || {}), [sectionId]: column };
  // Place at end of target column in order
  const { left, right } = presentByColumn({ ...cv, sectionColumns: columns }, split);
  const target = column === "left" ? left : right;
  if (!target.includes(sectionId)) {
    // should already be after columns update via presentByColumn
  }
  const other = column === "left" ? right : left;
  const orderedTarget = [...target.filter((id) => id !== sectionId), sectionId];
  const merged = column === "left" ? [...orderedTarget, ...other] : [...other, ...orderedTarget];
  const full = resolveSectionOrder(cv);
  const absent = full.filter((id) => !merged.includes(id));
  return { ...cv, sectionColumns: columns, sectionOrder: [...merged, ...absent] };
}

/** Insert dragged section before/after a drop target (same or other column). */
export function placeSectionRelative(
  cv: StructuredCv,
  draggedId: BodySectionId,
  targetId: BodySectionId,
  place: "before" | "after",
  split: LayoutSplit = "single",
): StructuredCv {
  if (draggedId === targetId) return cv;
  const targetCol = resolveSectionColumn(cv, targetId, split);
  const next = moveSectionColumn(cv, draggedId, targetCol, split);
  const { left, right } = presentByColumn(next, split);
  const lane = targetCol === "right" ? [...right] : [...left];
  const without = lane.filter((id) => id !== draggedId);
  let at = without.indexOf(targetId);
  if (at < 0) at = without.length;
  if (place === "after") at += 1;
  without.splice(at, 0, draggedId);
  const other = targetCol === "right" ? left.filter((id) => id !== draggedId) : right.filter((id) => id !== draggedId);
  const merged = targetCol === "right" ? [...other, ...without] : [...without, ...other];
  const full = resolveSectionOrder(next);
  const absent = full.filter((id) => !merged.includes(id));
  return { ...next, sectionOrder: [...merged, ...absent] };
}

export function setSectionOrder(cv: StructuredCv, order: BodySectionId[]): StructuredCv {
  const cleaned = order.filter(isBodySectionId);
  const seen = new Set(cleaned);
  const rest = DEFAULT_SECTION_ORDER.filter((id) => !seen.has(id));
  return { ...cv, sectionOrder: [...cleaned, ...rest] };
}

export function layoutSplitFromKind(kind: string): LayoutSplit {
  if (kind === "aurora") return "aurora";
  if (kind === "banner") return "banner";
  if (kind === "sidebar" || kind === "magazine") return "sidebar";
  return "single";
}
