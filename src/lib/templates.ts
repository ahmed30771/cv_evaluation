import type { TemplateId } from "@/lib/cv-types";

export type TemplateMeta = {
  id: TemplateId;
  label: string;
  layout: "single" | "multi";
  badge: "ATS recommended" | "Visual";
  description: string;
  swatches: [string, string];
};

/** Distinct layout engines — not just recolors */
export type TemplateKind =
  | "classic"
  | "compact"
  | "executive"
  | "timeline"
  | "sidebar"
  | "frame"
  | "magazine"
  | "banner"
  | "cards"
  | "aurora";

export type TemplateTheme = {
  id: TemplateId;
  kind: TemplateKind;
  accent: string;
  accentSoft: string;
  headerText: string;
  railBg: string;
  railText: string;
};

export const TEMPLATE_THEMES: Record<TemplateId, TemplateTheme> = {
  classic: {
    id: "classic",
    kind: "classic",
    accent: "#1A4F7A",
    accentSoft: "#e8eef4",
    headerText: "#ffffff",
    railBg: "#f8fafc",
    railText: "#132033",
  },
  compact: {
    id: "compact",
    kind: "compact",
    accent: "#334155",
    accentSoft: "#f1f5f9",
    headerText: "#ffffff",
    railBg: "#f8fafc",
    railText: "#0f172a",
  },
  executive: {
    id: "executive",
    kind: "executive",
    accent: "#0f766e",
    accentSoft: "#ccfbf1",
    headerText: "#ffffff",
    railBg: "#f0fdfa",
    railText: "#134e4a",
  },
  timeline: {
    id: "timeline",
    kind: "timeline",
    accent: "#b45309",
    accentSoft: "#fef3c7",
    headerText: "#ffffff",
    railBg: "#fffbeb",
    railText: "#78350f",
  },
  sidebar: {
    id: "sidebar",
    kind: "sidebar",
    accent: "#1e3a5f",
    accentSoft: "#dbeafe",
    headerText: "#ffffff",
    railBg: "#0f2744",
    railText: "#e8eef8",
  },
  frame: {
    id: "frame",
    kind: "frame",
    accent: "#7c3aed",
    accentSoft: "#ede9fe",
    headerText: "#ffffff",
    railBg: "#f5f3ff",
    railText: "#4c1d95",
  },
  magazine: {
    id: "magazine",
    kind: "magazine",
    accent: "#be123c",
    accentSoft: "#ffe4e6",
    headerText: "#ffffff",
    railBg: "#fff1f2",
    railText: "#881337",
  },
  ocean: {
    id: "ocean",
    kind: "banner",
    accent: "#0891b2",
    accentSoft: "#cffafe",
    headerText: "#ffffff",
    railBg: "#ecfeff",
    railText: "#164e63",
  },
  forest: {
    id: "forest",
    kind: "sidebar",
    accent: "#166534",
    accentSoft: "#dcfce7",
    headerText: "#ffffff",
    railBg: "#14532d",
    railText: "#ecfdf5",
  },
  indigo: {
    id: "indigo",
    kind: "cards",
    accent: "#4338ca",
    accentSoft: "#e0e7ff",
    headerText: "#ffffff",
    railBg: "#eef2ff",
    railText: "#1e1b4b",
  },
  sunset: {
    id: "sunset",
    kind: "banner",
    accent: "#c2410c",
    accentSoft: "#ffedd5",
    headerText: "#ffffff",
    railBg: "#fff7ed",
    railText: "#7c2d12",
  },
  aurora: {
    id: "aurora",
    kind: "aurora",
    accent: "#0e7490",
    accentSoft: "#a5f3fc",
    headerText: "#0f172a",
    railBg: "#ecfeff",
    railText: "#155e75",
  },
};

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "classic",
    label: "Classic",
    layout: "single",
    badge: "ATS recommended",
    description: "Elegant centered header, clear section rules — safest for ATS.",
    swatches: ["#1A4F7A", "#e8eef4"],
  },
  {
    id: "compact",
    label: "Compact",
    layout: "single",
    badge: "ATS recommended",
    description: "Tight typography for longer careers on one page.",
    swatches: ["#334155", "#f1f5f9"],
  },
  {
    id: "executive",
    label: "Executive",
    layout: "single",
    badge: "Visual",
    description: "Wide name block, contact row, refined role cards.",
    swatches: ["#0f766e", "#ccfbf1"],
  },
  {
    id: "timeline",
    label: "Timeline",
    layout: "single",
    badge: "Visual",
    description: "Career path with a vertical timeline and amber accents.",
    swatches: ["#b45309", "#fef3c7"],
  },
  {
    id: "sidebar",
    label: "Navy Rail",
    layout: "multi",
    badge: "Visual",
    description: "Dark navy sidebar for contact & skills; clean main pane.",
    swatches: ["#0f2744", "#dbeafe"],
  },
  {
    id: "frame",
    label: "Frame",
    layout: "single",
    badge: "Visual",
    description: "Double-border frame with violet accent corners.",
    swatches: ["#7c3aed", "#ede9fe"],
  },
  {
    id: "magazine",
    label: "Magazine",
    layout: "multi",
    badge: "Visual",
    description: "Bold asymmetric name column + story-style content.",
    swatches: ["#be123c", "#ffe4e6"],
  },
  {
    id: "ocean",
    label: "Ocean",
    layout: "multi",
    badge: "Visual",
    description: "Cyan banner with soft two-panel body.",
    swatches: ["#0891b2", "#cffafe"],
  },
  {
    id: "forest",
    label: "Forest",
    layout: "multi",
    badge: "Visual",
    description: "Deep green rail — premium outdoor/executive feel.",
    swatches: ["#14532d", "#dcfce7"],
  },
  {
    id: "indigo",
    label: "Indigo Cards",
    layout: "single",
    badge: "Visual",
    description: "Stacked soft cards for sections with indigo titles.",
    swatches: ["#4338ca", "#e0e7ff"],
  },
  {
    id: "sunset",
    label: "Sunset",
    layout: "multi",
    badge: "Visual",
    description: "Warm terracotta banner and chip skills.",
    swatches: ["#c2410c", "#ffedd5"],
  },
  {
    id: "aurora",
    label: "Aurora",
    layout: "multi",
    badge: "Visual",
    description: "Gradient wash header with airy two-column layout.",
    swatches: ["#0e7490", "#a5f3fc"],
  },
];

export function getTemplate(id: TemplateId): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

export function getTheme(id: TemplateId): TemplateTheme {
  return TEMPLATE_THEMES[id] || TEMPLATE_THEMES.classic;
}
