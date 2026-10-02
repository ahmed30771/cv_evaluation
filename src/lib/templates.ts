import type { TemplateId } from "@/lib/cv-types";

export type TemplateMeta = {
  id: TemplateId;
  label: string;
  layout: "single" | "multi";
  badge: "ATS recommended" | "Visual";
  description: string;
  /** Default accent pair for thumbs before Design override */
  swatches: [string, string];
  /** Layout can show an optional profile photo slot */
  supportsPhoto?: boolean;
};

/**
 * One kind per template — layout engines only.
 * Colors come from Design (`ColorThemeId`) via `resolveTheme`.
 */
export type TemplateKind =
  | "classic"
  | "compact"
  | "executive"
  | "timeline"
  | "sidebar"
  | "frame"
  | "magazine"
  | "folio"
  | "ribbon"
  | "cards"
  | "crest"
  | "aurora"
  | "portrait"
  | "spotlight"
  | "medallion";

export const COLOR_THEME_IDS = [
  "slate",
  "navy",
  "teal",
  "amber",
  "rose",
  "violet",
  "forest",
  "cyan",
  "indigo",
  "charcoal",
  "coral",
  "midnight",
  "burgundy",
  "emerald",
  "sky",
  "sand",
  "olive",
  "plum",
  "rust",
  "cobalt",
  "mint",
  "wine",
  "graphite",
  "copper",
] as const;

export type ColorThemeId = (typeof COLOR_THEME_IDS)[number];

export type ColorPalette = {
  id: ColorThemeId;
  label: string;
  accent: string;
  accentSoft: string;
  headerText: string;
  railBg: string;
  railText: string;
};

/** Design-rail color themes — independent of layout structure */
export const COLOR_PALETTES: Record<ColorThemeId, ColorPalette> = {
  slate: {
    id: "slate",
    label: "Slate",
    accent: "#334155",
    accentSoft: "#f1f5f9",
    headerText: "#ffffff",
    railBg: "#1e293b",
    railText: "#e2e8f0",
  },
  navy: {
    id: "navy",
    label: "Navy",
    accent: "#1A4F7A",
    accentSoft: "#e8eef4",
    headerText: "#ffffff",
    railBg: "#0f2744",
    railText: "#e8eef8",
  },
  teal: {
    id: "teal",
    label: "Teal",
    accent: "#0f766e",
    accentSoft: "#ccfbf1",
    headerText: "#ffffff",
    railBg: "#134e4a",
    railText: "#ecfdf5",
  },
  amber: {
    id: "amber",
    label: "Amber",
    accent: "#b45309",
    accentSoft: "#fef3c7",
    headerText: "#ffffff",
    railBg: "#78350f",
    railText: "#fffbeb",
  },
  rose: {
    id: "rose",
    label: "Rose",
    accent: "#be123c",
    accentSoft: "#ffe4e6",
    headerText: "#ffffff",
    railBg: "#881337",
    railText: "#fff1f2",
  },
  violet: {
    id: "violet",
    label: "Violet",
    accent: "#7c3aed",
    accentSoft: "#ede9fe",
    headerText: "#ffffff",
    railBg: "#4c1d95",
    railText: "#f5f3ff",
  },
  forest: {
    id: "forest",
    label: "Forest",
    accent: "#166534",
    accentSoft: "#dcfce7",
    headerText: "#ffffff",
    railBg: "#14532d",
    railText: "#ecfdf5",
  },
  cyan: {
    id: "cyan",
    label: "Cyan",
    accent: "#0891b2",
    accentSoft: "#cffafe",
    headerText: "#ffffff",
    railBg: "#155e75",
    railText: "#ecfeff",
  },
  indigo: {
    id: "indigo",
    label: "Indigo",
    accent: "#4338ca",
    accentSoft: "#e0e7ff",
    headerText: "#ffffff",
    railBg: "#1e1b4b",
    railText: "#eef2ff",
  },
  charcoal: {
    id: "charcoal",
    label: "Charcoal",
    accent: "#111827",
    accentSoft: "#f3f4f6",
    headerText: "#ffffff",
    railBg: "#030712",
    railText: "#f9fafb",
  },
  coral: {
    id: "coral",
    label: "Coral",
    accent: "#c2410c",
    accentSoft: "#ffedd5",
    headerText: "#ffffff",
    railBg: "#7c2d12",
    railText: "#fff7ed",
  },
  midnight: {
    id: "midnight",
    label: "Midnight",
    accent: "#1e3a5f",
    accentSoft: "#dbeafe",
    headerText: "#0f172a",
    railBg: "#0b1220",
    railText: "#e2e8f0",
  },
  burgundy: {
    id: "burgundy",
    label: "Burgundy",
    accent: "#9f1239",
    accentSoft: "#fce7f3",
    headerText: "#ffffff",
    railBg: "#4c0519",
    railText: "#fdf2f8",
  },
  emerald: {
    id: "emerald",
    label: "Emerald",
    accent: "#047857",
    accentSoft: "#d1fae5",
    headerText: "#ffffff",
    railBg: "#064e3b",
    railText: "#ecfdf5",
  },
  sky: {
    id: "sky",
    label: "Sky",
    accent: "#0284c7",
    accentSoft: "#e0f2fe",
    headerText: "#ffffff",
    railBg: "#0c4a6e",
    railText: "#f0f9ff",
  },
  sand: {
    id: "sand",
    label: "Sand",
    accent: "#a16207",
    accentSoft: "#fef9c3",
    headerText: "#ffffff",
    railBg: "#713f12",
    railText: "#fefce8",
  },
  olive: {
    id: "olive",
    label: "Olive",
    accent: "#4d7c0f",
    accentSoft: "#ecfccb",
    headerText: "#ffffff",
    railBg: "#365314",
    railText: "#f7fee7",
  },
  plum: {
    id: "plum",
    label: "Plum",
    accent: "#86198f",
    accentSoft: "#fae8ff",
    headerText: "#ffffff",
    railBg: "#4a044e",
    railText: "#fdf4ff",
  },
  rust: {
    id: "rust",
    label: "Rust",
    accent: "#9a3412",
    accentSoft: "#ffedd5",
    headerText: "#ffffff",
    railBg: "#7c2d12",
    railText: "#fff7ed",
  },
  cobalt: {
    id: "cobalt",
    label: "Cobalt",
    accent: "#1d4ed8",
    accentSoft: "#dbeafe",
    headerText: "#ffffff",
    railBg: "#1e3a8a",
    railText: "#eff6ff",
  },
  mint: {
    id: "mint",
    label: "Mint",
    accent: "#0d9488",
    accentSoft: "#ccfbf1",
    headerText: "#ffffff",
    railBg: "#115e59",
    railText: "#f0fdfa",
  },
  wine: {
    id: "wine",
    label: "Wine",
    accent: "#7f1d1d",
    accentSoft: "#fee2e2",
    headerText: "#ffffff",
    railBg: "#450a0a",
    railText: "#fef2f2",
  },
  graphite: {
    id: "graphite",
    label: "Graphite",
    accent: "#3f3f46",
    accentSoft: "#f4f4f5",
    headerText: "#ffffff",
    railBg: "#18181b",
    railText: "#fafafa",
  },
  copper: {
    id: "copper",
    label: "Copper",
    accent: "#b45309",
    accentSoft: "#fef3c7",
    headerText: "#ffffff",
    railBg: "#92400e",
    railText: "#fffbeb",
  },
};

export function isColorThemeId(value: unknown): value is ColorThemeId {
  return typeof value === "string" && (COLOR_THEME_IDS as readonly string[]).includes(value);
}

export type CustomColorPalette = {
  id: string;
  label: string;
  accent: string;
  accentSoft: string;
  headerText: string;
  railBg: string;
  railText: string;
};

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string): [number, number, number] | null {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => clampByte(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Mix `from` toward `to` by amount 0..1 */
function mixHex(from: string, to: string, amount: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return from;
  const t = Math.max(0, Math.min(1, amount));
  return toHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return parseHex(withHash) ? withHash.toLowerCase() : null;
}

export function derivePaletteFromAccent(accentInput: string): Omit<CustomColorPalette, "id" | "label"> {
  const accent = normalizeHexColor(accentInput) || "#1a4f7a";
  return {
    accent,
    accentSoft: mixHex(accent, "#ffffff", 0.88),
    headerText: "#ffffff",
    railBg: mixHex(accent, "#0a0a0a", 0.58),
    railText: mixHex(accent, "#ffffff", 0.9),
  };
}

export function createCustomPalette(
  label: string,
  accent: string,
  overrides?: Partial<Pick<CustomColorPalette, "accentSoft" | "headerText" | "railBg" | "railText">>,
): CustomColorPalette {
  const derived = derivePaletteFromAccent(accent);
  return {
    id: `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    label: (label.trim() || "Custom").slice(0, 40),
    accent: derived.accent,
    accentSoft: normalizeHexColor(overrides?.accentSoft) || derived.accentSoft,
    headerText: normalizeHexColor(overrides?.headerText) || derived.headerText,
    railBg: normalizeHexColor(overrides?.railBg) || derived.railBg,
    railText: normalizeHexColor(overrides?.railText) || derived.railText,
  };
}

/** Stable id for the live Design-panel color strips (no named save). */
export const LIVE_CUSTOM_THEME_ID = "custom_live";

export function buildLiveCustomPalette(
  base: Pick<ColorPalette, "accent" | "accentSoft" | "headerText" | "railBg" | "railText">,
  patch: Partial<Pick<ColorPalette, "accent" | "accentSoft" | "railBg">>,
): CustomColorPalette {
  const accent = normalizeHexColor(patch.accent) || normalizeHexColor(base.accent) || "#1a4f7a";
  const derived = derivePaletteFromAccent(accent);
  return {
    id: LIVE_CUSTOM_THEME_ID,
    label: "Custom",
    accent,
    accentSoft: normalizeHexColor(patch.accentSoft) || normalizeHexColor(base.accentSoft) || derived.accentSoft,
    headerText: normalizeHexColor(base.headerText) || derived.headerText,
    railBg: normalizeHexColor(patch.railBg) || normalizeHexColor(base.railBg) || derived.railBg,
    railText: normalizeHexColor(base.railText) || derived.railText,
  };
}

export function isCustomThemeId(value: unknown): value is string {
  return typeof value === "string" && /^custom_[a-z0-9_]+$/i.test(value) && value.length <= 48;
}

export function normalizeCustomThemes(value: unknown): CustomColorPalette[] {
  if (!Array.isArray(value)) return [];
  const out: CustomColorPalette[] = [];
  for (const row of value.slice(0, 24)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (!isCustomThemeId(r.id)) continue;
    const accent = normalizeHexColor(r.accent);
    if (!accent) continue;
    const derived = derivePaletteFromAccent(accent);
    out.push({
      id: String(r.id),
      label: typeof r.label === "string" && r.label.trim() ? r.label.trim().slice(0, 40) : "Custom",
      accent,
      accentSoft: normalizeHexColor(r.accentSoft) || derived.accentSoft,
      headerText: normalizeHexColor(r.headerText) || derived.headerText,
      railBg: normalizeHexColor(r.railBg) || derived.railBg,
      railText: normalizeHexColor(r.railText) || derived.railText,
    });
  }
  return out;
}

export function findColorPalette(
  colorThemeId: string | null | undefined,
  customThemes?: CustomColorPalette[] | null,
): ColorPalette | CustomColorPalette | null {
  if (!colorThemeId) return null;
  const custom = customThemes?.find((t) => t.id === colorThemeId);
  if (custom) return custom;
  if (isColorThemeId(colorThemeId)) return COLOR_PALETTES[colorThemeId];
  return null;
}

/** Default color for each layout when Design has no override */
export const TEMPLATE_DEFAULT_COLOR: Record<TemplateId, ColorThemeId> = {
  classic: "navy",
  compact: "slate",
  executive: "teal",
  timeline: "amber",
  sidebar: "navy",
  frame: "violet",
  magazine: "rose",
  ocean: "cyan",
  forest: "forest",
  indigo: "indigo",
  sunset: "coral",
  aurora: "midnight",
  portrait: "navy",
  spotlight: "teal",
  medallion: "rose",
};

export type TemplateTheme = {
  id: TemplateId;
  kind: TemplateKind;
  accent: string;
  accentSoft: string;
  headerText: string;
  railBg: string;
  railText: string;
  /** Built-in ColorThemeId or custom_* id */
  colorId: string;
};

/** Structure only — colors applied in `resolveTheme` */
export const TEMPLATE_KINDS: Record<TemplateId, TemplateKind> = {
  classic: "classic",
  compact: "compact",
  executive: "executive",
  timeline: "timeline",
  sidebar: "sidebar",
  frame: "frame",
  magazine: "magazine",
  ocean: "folio",
  forest: "ribbon",
  indigo: "cards",
  sunset: "crest",
  aurora: "aurora",
  portrait: "portrait",
  spotlight: "spotlight",
  medallion: "medallion",
};

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "classic",
    label: "Classic",
    layout: "single",
    badge: "ATS recommended",
    description: "Centered header + accent rule. Single column.",
    swatches: ["#1A4F7A", "#e8eef4"],
  },
  {
    id: "compact",
    label: "Compact",
    layout: "single",
    badge: "ATS recommended",
    description: "Denser type and tighter margins for longer CVs.",
    swatches: ["#334155", "#f1f5f9"],
  },
  {
    id: "executive",
    label: "Executive",
    layout: "single",
    badge: "ATS recommended",
    description: "Left-aligned name with a thick underline bar.",
    swatches: ["#0f766e", "#ccfbf1"],
  },
  {
    id: "timeline",
    label: "Timeline",
    layout: "single",
    badge: "ATS recommended",
    description: "Vertical timeline rail beside experience.",
    swatches: ["#b45309", "#fef3c7"],
  },
  {
    id: "sidebar",
    label: "Sidebar",
    layout: "multi",
    badge: "Visual",
    description: "Full-height left rail for contact & skills.",
    swatches: ["#0f2744", "#dbeafe"],
  },
  {
    id: "frame",
    label: "Frame",
    layout: "single",
    badge: "Visual",
    description: "Inset border frame around the whole page.",
    swatches: ["#7c3aed", "#ede9fe"],
  },
  {
    id: "magazine",
    label: "Magazine",
    layout: "multi",
    badge: "Visual",
    description: "Narrow accent column + story-style main pane.",
    swatches: ["#be123c", "#ffe4e6"],
  },
  {
    id: "ocean",
    label: "Folio",
    layout: "multi",
    badge: "Visual",
    description: "Top color bar, split name/contact header, two columns.",
    swatches: ["#0891b2", "#cffafe"],
  },
  {
    id: "forest",
    label: "Ribbon",
    layout: "single",
    badge: "Visual",
    description: "Thin left ribbon edge with open single column.",
    swatches: ["#14532d", "#dcfce7"],
  },
  {
    id: "indigo",
    label: "Cards",
    layout: "single",
    badge: "Visual",
    description: "Soft stacked cards for each section.",
    swatches: ["#4338ca", "#e0e7ff"],
  },
  {
    id: "sunset",
    label: "Crest",
    layout: "single",
    badge: "Visual",
    description: "Centered crest header with ornamental rules.",
    swatches: ["#c2410c", "#ffedd5"],
  },
  {
    id: "aurora",
    label: "Aurora",
    layout: "multi",
    badge: "Visual",
    description: "Gradient wash header with two-column body.",
    swatches: ["#0e7490", "#a5f3fc"],
  },
  {
    id: "portrait",
    label: "Portrait",
    layout: "single",
    badge: "Visual",
    description: "Optional circular photo beside name and contact.",
    swatches: ["#1A4F7A", "#e8eef4"],
    supportsPhoto: true,
  },
  {
    id: "spotlight",
    label: "Spotlight",
    layout: "multi",
    badge: "Visual",
    description: "Accent banner with optional photo on the right.",
    swatches: ["#0f766e", "#ccfbf1"],
    supportsPhoto: true,
  },
  {
    id: "medallion",
    label: "Medallion",
    layout: "single",
    badge: "Visual",
    description: "Centered header with optional round photo above the name.",
    swatches: ["#be123c", "#ffe4e6"],
    supportsPhoto: true,
  },
];

export function getTemplate(id: TemplateId): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

export function templateSupportsPhoto(kind: TemplateKind): boolean {
  return kind === "portrait" || kind === "spotlight" || kind === "medallion";
}

/** @deprecated Prefer resolveTheme — kept for call sites that only need structure defaults */
export function getTheme(id: TemplateId): TemplateTheme {
  return resolveTheme(id, null);
}

export function resolveTheme(
  templateId: TemplateId,
  colorThemeId?: string | null,
  customThemes?: CustomColorPalette[] | null,
): TemplateTheme {
  const id = TEMPLATE_KINDS[templateId] ? templateId : "classic";
  const kind = TEMPLATE_KINDS[id];
  const resolved =
    findColorPalette(colorThemeId, customThemes) || COLOR_PALETTES[TEMPLATE_DEFAULT_COLOR[id]];
  return {
    id,
    kind,
    colorId: resolved.id,
    accent: resolved.accent,
    accentSoft: resolved.accentSoft,
    headerText: resolved.headerText,
    railBg: resolved.railBg,
    railText: resolved.railText,
  };
}

/** Soft wash header for Aurora — follows Design color theme */
export function auroraHeaderGradient(accent: string, accentSoft: string): string {
  return `linear-gradient(125deg, ${accentSoft} 0%, ${accent}55 45%, ${accentSoft} 100%)`;
}
