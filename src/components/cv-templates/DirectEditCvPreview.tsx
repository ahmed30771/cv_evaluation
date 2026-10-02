"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { StructuredCv, TemplateId } from "@/lib/cv-types";
import { auroraHeaderGradient, resolveTheme, templateSupportsPhoto, type CustomColorPalette } from "@/lib/templates";
import { improveDraftText } from "@/lib/api";
import {
  looksLikeHtml,
  rememberEditSelection,
  serializeEditField,
  startFormatSelectionTracking,
} from "@/lib/text-format";
import { CvPhotoSlot } from "@/components/cv-templates/CvPhotoSlot";
import {
  addSectionTemplate,
  availableSectionTemplates,
  clearSection,
  sectionIsPresent,
  type SectionTemplateId,
} from "@/lib/section-templates";
import {
  layoutSplitFromKind,
  moveSectionColumn,
  placeSectionRelative,
  presentByColumn,
  presentSectionsInOrder,
  type LayoutSplit,
} from "@/lib/section-order";
import type { BodySectionId } from "@/lib/cv-types";
import { SectionShell, type SectionActionTarget } from "@/components/cv-templates/SectionShell";
import { CvA4Pages, type PageContentRef, type PageMeta } from "@/components/cv-templates/CvA4Pages";
import { isBodySectionId } from "@/lib/cv-types";
import { A4_WIDTH_PX } from "@/lib/a4";

const wrap: CSSProperties = {
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  maxWidth: "100%",
  minWidth: 0,
};

/** Build mailto / tel / https href for contact chips (Canva-style open-on-click). */
function linkHrefForPart(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^mailto:/i.test(t) || /^tel:/i.test(t) || /^https?:\/\//i.test(t)) return t;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(t)) return `mailto:${t}`;
  const digits = t.replace(/[^\d+]/g, "");
  if (/^(\+?\d[\d\s().-]{6,}\d)$/.test(t) && digits.replace(/\D/g, "").length >= 7) {
    return `tel:${digits.startsWith("+") ? digits : digits.replace(/\D/g, "")}`;
  }
  if (/^(www\.|linkedin\.com\/|github\.com\/|gitlab\.com\/|bitbucket\.org\/|behance\.net\/|dribbble\.com\/|medium\.com\/|twitter\.com\/|x\.com\/)/i.test(t)) {
    return `https://${t.replace(/^\/\//, "")}`;
  }
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(\/\S*)?$/i.test(t)) return `https://${t}`;
  return null;
}

function normalizeManualHref(raw: string, hint?: "email" | "phone" | "web"): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^(mailto:|tel:|https?:\/\/)/i.test(t)) return t;
  if (hint === "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(t)) return `mailto:${t}`;
  if (hint === "phone" || /^[\d+\s().-]{7,}$/.test(t)) {
    const digits = t.replace(/[^\d+]/g, "");
    return `tel:${digits.startsWith("+") ? digits : digits.replace(/\D/g, "")}`;
  }
  return `https://${t.replace(/^\/\//, "")}`;
}

function LinkedContactField({
  value,
  href,
  onCommit,
  onHrefCommit,
  style,
  placeholder,
  onFocusField,
  multiline,
  hrefHint,
}: {
  value: string;
  href?: string;
  onCommit: (next: string) => void;
  onHrefCommit: (next: string) => void;
  style?: CSSProperties;
  placeholder?: string;
  onFocusField?: (el: HTMLElement, getText: () => string, commit: (t: string) => void) => void;
  multiline?: boolean;
  hrefHint?: "email" | "phone" | "web";
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [draftHref, setDraftHref] = useState(href || "");
  const seedHrefFromValue = () => {
    const line = multiline
      ? value.split("\n").map((l) => l.trim()).find(Boolean) || ""
      : value;
    return linkHrefForPart(line) || normalizeManualHref(line, hrefHint) || "";
  };
  const autoHref = seedHrefFromValue() || null;
  const resolved = (href || "").trim() || autoHref;
  const hasManual = !!(href || "").trim();

  useEffect(() => {
    if (!linkOpen) return;
    // Always prefer rebuilding from the visible field text (email/phone/url above).
    const fromField = seedHrefFromValue();
    setDraftHref(fromField || (href || "").trim() || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reseed when the popover opens
  }, [linkOpen]);

  function openLinkPop() {
    const fromField = seedHrefFromValue();
    setDraftHref(fromField || (href || "").trim() || "");
    setLinkOpen(true);
  }

  return (
    <div className={`cv-contact-field${linkOpen ? " is-linking" : ""}`} style={style}>
      <EditableText
        value={value}
        multiline={multiline}
        placeholder={placeholder}
        className={resolved ? "cv-edit-field--linkish" : undefined}
        title={
          resolved
            ? hasManual
              ? "Linked · Ctrl/Cmd+click to open"
              : "Edit text · Ctrl/Cmd+click to open link"
            : undefined
        }
        onCommit={onCommit}
        onFocusField={onFocusField}
        onClick={(e) => {
          if (!resolved) return;
          if (!(e.metaKey || e.ctrlKey)) return;
          e.preventDefault();
          if (resolved.startsWith("http")) window.open(resolved, "_blank", "noopener,noreferrer");
          else window.location.href = resolved;
        }}
      />
      <button
        type="button"
        className={`cv-contact-link-btn${hasManual || resolved ? " has-link" : ""}`}
        title={hasManual ? "Edit link" : "Add link"}
        aria-label={hasManual ? "Edit link" : "Add link"}
        aria-expanded={linkOpen}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          if (linkOpen) setLinkOpen(false);
          else openLinkPop();
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L11 5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L13 19"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {linkOpen && (
        <div className="cv-contact-link-pop" onMouseDown={(e) => e.stopPropagation()}>
          <label className="cv-contact-link-pop-label" htmlFor={`href-${placeholder || "field"}`}>
            Link URL
          </label>
          <input
            id={`href-${placeholder || "field"}`}
            className="cv-contact-link-pop-input"
            value={draftHref}
            placeholder={
              hrefHint === "email"
                ? "mailto:name@email.com"
                : hrefHint === "phone"
                  ? "tel:+123456789"
                  : "https://…"
            }
            onChange={(e) => setDraftHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onHrefCommit(normalizeManualHref(draftHref, hrefHint));
                setLinkOpen(false);
              }
              if (e.key === "Escape") setLinkOpen(false);
            }}
            autoFocus
          />
          <div className="cv-contact-link-pop-actions">
            <button
              type="button"
              className="cv-contact-link-pop-apply"
              onClick={() => {
                onHrefCommit(normalizeManualHref(draftHref, hrefHint));
                setLinkOpen(false);
              }}
            >
              Apply
            </button>
            <button
              type="button"
              className="cv-contact-link-pop-clear"
              onClick={() => {
                setDraftHref("");
                onHrefCommit("");
                setLinkOpen(false);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditableText({
  value,
  onCommit,
  multiline,
  style,
  className,
  placeholder,
  onFocusField,
  autoFocus,
  title,
  onClick,
}: {
  value: string;
  onCommit: (next: string) => void;
  multiline?: boolean;
  style?: CSSProperties;
  className?: string;
  placeholder?: string;
  onFocusField?: (el: HTMLElement, getText: () => string, commit: (t: string) => void) => void;
  autoFocus?: boolean;
  title?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
}) {
  const ref = useRef<HTMLDivElement | HTMLSpanElement | null>(null);

  useEffect(() => {
    startFormatSelectionTracking();
  }, []);

  const syncDom = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      if (document.activeElement === el) return;
      const plainCurrent = (el.innerText || el.textContent || "").replace(/\u00a0/g, " ");
      const plainValue = looksLikeHtml(value || "")
        ? // compare against rendered text roughly
          (value || "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ")
        : value || "";
      // If plain text matches and DOM already has richer HTML, keep it unless the stored value is HTML.
      if (looksLikeHtml(value || "")) {
        if (el.innerHTML.replace(/\u00a0/g, " ").trim() !== (value || "").trim()) {
          el.innerHTML = value || "";
        }
        return;
      }
      if (plainCurrent !== plainValue) {
        el.textContent = value || "";
      }
    },
    [value],
  );

  useEffect(() => {
    syncDom(ref.current);
  }, [syncDom]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onApplied = () => {
      rememberEditSelection(el);
      const next = serializeEditField(el);
      if (next !== value) onCommit(next);
    };
    el.addEventListener("cv-format-applied", onApplied as EventListener);
    return () => el.removeEventListener("cv-format-applied", onApplied as EventListener);
  }, [onCommit, value]);

  useEffect(() => {
    if (!autoFocus || !ref.current) return;
    const el = ref.current;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }, [autoFocus]);

  const setNode = useCallback(
    (node: HTMLDivElement | HTMLSpanElement | null) => {
      ref.current = node;
      syncDom(node);
    },
    [syncDom],
  );

  const commit = () => {
    const el = ref.current;
    if (!el) return;
    const next = serializeEditField(el);
    if (next !== value) onCommit(next);
  };

  const onFocus = (e: FocusEvent<HTMLElement>) => {
    (window as unknown as { __cvLastEditField?: HTMLElement }).__cvLastEditField = e.currentTarget;
    rememberEditSelection(e.currentTarget);
    onFocusField?.(
      e.currentTarget,
      () => serializeEditField(e.currentTarget),
      (t) => {
        if (ref.current) {
          if (looksLikeHtml(t)) ref.current.innerHTML = t;
          else ref.current.textContent = t;
          onCommit(t);
        }
      },
    );
  };

  const onBlur = () => {
    rememberEditSelection(ref.current);
    commit();
  };

  const onInput = () => {
    rememberEditSelection(ref.current);
  };

  const onKeyUp = () => {
    rememberEditSelection(ref.current);
  };

  const onMouseUp = () => {
    rememberEditSelection(ref.current);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };

  const baseStyle: CSSProperties = {
    ...wrap,
    outline: "none",
    cursor: "text",
    borderRadius: 4,
    minHeight: multiline ? "1.4em" : undefined,
    whiteSpace: multiline ? "pre-wrap" : undefined,
    ...style,
  };

  const shared = {
    className: `cv-edit-field ${className || ""}`,
    contentEditable: true as const,
    suppressContentEditableWarning: true,
    role: "textbox" as const,
    "aria-placeholder": placeholder,
    "data-placeholder": placeholder || undefined,
    title,
    style: baseStyle,
    onBlur,
    onFocus,
    onInput,
    onKeyUp,
    onMouseUp,
    onKeyDown,
    onClick,
  };

  if (multiline) {
    return <div ref={setNode as (n: HTMLDivElement | null) => void} {...shared} />;
  }

  return <span ref={setNode as (n: HTMLSpanElement | null) => void} {...shared} />;
}

function SectionTitle({ children, accent }: { children: ReactNode; accent: string }) {
  return (
    <h3
      className="cv-section-title"
      style={{
        margin: "0 0 0.4rem",
        fontSize: "0.7rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        borderBottom: `2px solid ${accent}`,
        paddingBottom: 3,
        color: accent,
        fontWeight: 750,
      }}
    >
      {children}
    </h3>
  );
}

type FocusAi = {
  el: HTMLElement;
  getText: () => string;
  commit: (t: string) => void;
  section: string;
} | null;

function collectSectionText(cv: StructuredCv, target: SectionActionTarget): string {
  if (target.scope === "section") {
    switch (target.sectionId as SectionTemplateId) {
      case "summary":
        return cv.summary;
      case "skills":
        return cv.skills.join(", ");
      case "certifications":
        return cv.certifications.join(", ");
      case "languages":
        return (cv.languages ?? []).join(", ");
      case "awards":
        return (cv.awards ?? []).join(", ");
      case "interests":
        return (cv.interests ?? []).join(", ");
      case "experience":
        return cv.experience
          .map(
            (j) =>
              `${j.title} — ${j.company}\n${j.start} – ${j.end}\n${j.bullets.map((b) => `• ${b}`).join("\n")}`,
          )
          .join("\n\n");
      case "education":
        return cv.education.map((e) => [e.degree, e.school, e.year].filter(Boolean).join(" · ")).join("\n");
      case "projects":
        return cv.projects.map((p) => `${p.name}\n${p.description}`).join("\n\n");
      default:
        return "";
    }
  }
  const i = target.index;
  if (target.sectionId === "experience") {
    const j = cv.experience[i];
    if (!j) return "";
    return `${j.title} — ${j.company}\n${j.start} – ${j.end}\n${j.bullets.map((b) => `• ${b}`).join("\n")}`;
  }
  if (target.sectionId === "education") {
    const e = cv.education[i];
    if (!e) return "";
    return [e.degree, e.school, e.year].filter(Boolean).join(" · ");
  }
  if (target.sectionId === "projects") {
    const p = cv.projects[i];
    if (!p) return "";
    return `${p.name}\n${p.description}`;
  }
  return "";
}

export function DirectEditCvPreview({
  cv,
  templateId,
  colorThemeId,
  customThemes,
  evaluationId,
  onPatch,
  onPageMetaChange,
  zoom = 1,
}: {
  cv: StructuredCv;
  templateId: TemplateId;
  colorThemeId?: string | null;
  customThemes?: CustomColorPalette[] | null;
  evaluationId: string;
  onPatch: (updater: (prev: StructuredCv) => StructuredCv) => void;
  onPageMetaChange?: (meta: PageMeta) => void;
  zoom?: number;
}) {
  const theme = resolveTheme(templateId, colorThemeId, customThemes);
  const kind = theme.kind;
  const splitMode: LayoutSplit = layoutSplitFromKind(kind);
  const isSidebar = kind === "sidebar";
  const isAurora = kind === "aurora";
  const isMagazine = kind === "magazine";
  const isCards = kind === "cards";
  const isFrame = kind === "frame";
  const isFolio = kind === "folio";
  const isRibbon = kind === "ribbon";
  const isCrest = kind === "crest";
  const isPortrait = kind === "portrait";
  const isSpotlight = kind === "spotlight";
  const isMedallion = kind === "medallion";
  const compact = kind === "compact";
  const showPhotoSlot = templateSupportsPhoto(kind);
  const [focusAi, setFocusAi] = useState<FocusAi>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [laneDrop, setLaneDrop] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    const clear = () => setLaneDrop(null);
    document.addEventListener("dragend", clear, true);
    document.addEventListener("drop", clear, true);
    document.addEventListener("pointerup", clear, true);
    return () => {
      document.removeEventListener("dragend", clear, true);
      document.removeEventListener("drop", clear, true);
      document.removeEventListener("pointerup", clear, true);
    };
  }, []);

  const bindFocus = useCallback(
    (section: string) => (el: HTMLElement, getText: () => string, commit: (t: string) => void) => {
      setFocusAi({ el, getText, commit, section });
      setAiErr(null);
    },
    [],
  );

  const addFromTemplate = (id: SectionTemplateId) => {
    onPatch((p) => addSectionTemplate(p, id));
    setPickerOpen(false);
  };

  const duplicatePageContent = () => {
    onPatch((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        ...prev.experience.map((e) => ({
          ...e,
          bullets: [...e.bullets],
        })),
      ],
      education: [
        ...prev.education,
        ...prev.education.map((e) => ({ ...e })),
      ],
      projects: [
        ...prev.projects,
        ...prev.projects.map((p) => ({
          ...p,
          bullets: p.bullets ? [...p.bullets] : undefined,
        })),
      ],
      certifications: [...prev.certifications, ...prev.certifications],
      languages: [...prev.languages, ...prev.languages],
      awards: [...prev.awards, ...prev.awards],
      interests: [...prev.interests, ...prev.interests],
      summary: prev.summary ? `${prev.summary}\n\n${prev.summary}` : prev.summary,
      skills: [...prev.skills, ...prev.skills],
    }));
  };

  /** Blank pages are empty sheets — do not seed sections onto page 1. */
  const prepareNewPageContent = () => {
    /* no-op: CvA4Pages only bumps minPages for a trailing blank sheet */
  };

  const deletePageContent = (refs: PageContentRef[]) => {
    if (!refs.length) return;
    onPatch((prev) => {
      const entryIndexes = (sectionId: string) =>
        refs
          .filter(
            (r): r is Extract<PageContentRef, { kind: "entry" }> =>
              r.kind === "entry" && r.sectionId === sectionId,
          )
          .map((r) => r.index);
      const dropExp = new Set(entryIndexes("experience"));
      const dropEdu = new Set(entryIndexes("education"));
      const dropProj = new Set(entryIndexes("projects"));
      const dropSections = new Set(
        refs.filter((r) => r.kind === "section").map((r) => r.sectionId),
      );

      let next = {
        ...prev,
        experience: prev.experience.filter((_, i) => !dropExp.has(i)),
        education: prev.education.filter((_, i) => !dropEdu.has(i)),
        projects: prev.projects.filter((_, i) => !dropProj.has(i)),
      };

      for (const id of dropSections) {
        if (
          id === "experience" ||
          id === "education" ||
          id === "projects" ||
          id === "skills" ||
          id === "summary" ||
          id === "certifications" ||
          id === "languages" ||
          id === "awards" ||
          id === "interests"
        ) {
          next = clearSection(next, id);
        }
      }
      return next;
    });
  };

  const missingSections = availableSectionTemplates(cv);

  const activate = (key: string) => {
    setActiveKey(key);
    setAiErr(null);
  };

  const handleDelete = (target: SectionActionTarget) => {
    if (target.scope === "section") {
      if (target.sectionId === "personal") {
        onPatch((p) => ({ ...p, personal: { ...p.personal, fullName: "" } }));
      } else if (target.sectionId === "contact") {
        onPatch((p) => ({
          ...p,
          personal: {
            ...p.personal,
            email: "",
            phone: "",
            location: "",
            links: [],
            hrefs: undefined,
          },
        }));
      } else {
        onPatch((p) => clearSection(p, target.sectionId as SectionTemplateId));
      }
    } else if (target.sectionId === "experience") {
      onPatch((p) => ({ ...p, experience: p.experience.filter((_, idx) => idx !== target.index) }));
    } else if (target.sectionId === "education") {
      onPatch((p) => ({ ...p, education: p.education.filter((_, idx) => idx !== target.index) }));
    } else if (target.sectionId === "projects") {
      onPatch((p) => ({ ...p, projects: p.projects.filter((_, idx) => idx !== target.index) }));
    }
    setActiveKey(null);
  };

  async function handleAiImprove(target: SectionActionTarget, instruction: string) {
    const text = collectSectionText(cv, target).trim();
    if (!text) {
      setAiErr("Nothing to improve in this block yet.");
      return;
    }
    setAiBusy(true);
    setAiErr(null);
    try {
      const res = await improveDraftText(evaluationId, {
        text,
        section: target.sectionId,
        instruction,
      });
      const improved = res.improved.trim();
      if (target.scope === "section") {
        const id = target.sectionId as SectionTemplateId;
        onPatch((p) => {
          if (id === "summary") return { ...p, summary: improved };
          if (id === "skills") {
            return { ...p, skills: improved.split(",").map((s) => s.trim()).filter(Boolean) };
          }
          if (id === "certifications") {
            return { ...p, certifications: improved.split(",").map((s) => s.trim()).filter(Boolean) };
          }
          if (id === "languages") {
            return { ...p, languages: improved.split(",").map((s) => s.trim()).filter(Boolean) };
          }
          if (id === "awards") {
            return { ...p, awards: improved.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) };
          }
          if (id === "interests") {
            return { ...p, interests: improved.split(",").map((s) => s.trim()).filter(Boolean) };
          }
          // multi-entry sections: apply to first field-focus commit path via focusAi if available
          if (focusAi && focusAi.section === target.sectionId) {
            focusAi.commit(improved);
          }
          return p;
        });
      } else if (target.sectionId === "experience") {
        const lines = improved.split("\n").map((s) => s.trim()).filter(Boolean);
        const titleLine = lines[0] || "";
        const [title, ...rest] = titleLine.split("—").map((s) => s.trim());
        const dateLine = lines.find((l) => /–|-/.test(l) && l.length < 40) || "";
        const [start, end] = dateLine.split(/–|-/).map((s) => s.trim());
        const bullets = lines
          .filter((l) => l !== titleLine && l !== dateLine)
          .map((s) => s.replace(/^[-•*]\s*/, ""));
        onPatch((p) => {
          const experience = [...p.experience];
          if (!experience[target.index]) return p;
          experience[target.index] = {
            ...experience[target.index],
            title: title || experience[target.index].title,
            company: rest.join(" — ") || experience[target.index].company,
            start: start || experience[target.index].start,
            end: end || experience[target.index].end,
            bullets: bullets.length ? bullets : experience[target.index].bullets,
          };
          return { ...p, experience };
        });
      } else if (target.sectionId === "education") {
        const parts = improved.split("·").map((s) => s.trim());
        onPatch((p) => {
          const education = [...p.education];
          if (!education[target.index]) return p;
          education[target.index] = {
            ...education[target.index],
            degree: parts[0] || education[target.index].degree,
            school: parts[1] || education[target.index].school,
            year: parts[2] || education[target.index].year,
          };
          return { ...p, education };
        });
      } else if (target.sectionId === "projects") {
        const [nameLine, ...rest] = improved.split("\n");
        onPatch((p) => {
          const projects = [...p.projects];
          if (!projects[target.index]) return p;
          projects[target.index] = {
            ...projects[target.index],
            name: nameLine?.trim() || projects[target.index].name,
            description: rest.join("\n").trim() || projects[target.index].description,
          };
          return { ...p, projects };
        });
      }
    } catch (err) {
      setAiErr(err instanceof Error ? err.message : "AI failed");
    } finally {
      setAiBusy(false);
    }
  }

  const handleDropSection = (draggedId: string, targetId: string, place: "before" | "after") => {
    if (!isBodySectionId(draggedId) || !isBodySectionId(targetId)) return;
    onPatch((p) => placeSectionRelative(p, draggedId, targetId, place, splitMode));
  };

  const handleDropEntry = (
    sectionId: string,
    fromIndex: number,
    toIndex: number,
    place: "before" | "after",
  ) => {
    let insertAt = place === "after" ? toIndex + 1 : toIndex;
    if (fromIndex < insertAt) insertAt -= 1;
    if (fromIndex === insertAt) return;

    const reorder = <T,>(arr: T[]) => {
      if (fromIndex < 0 || fromIndex >= arr.length) return arr;
      const next = [...arr];
      const [item] = next.splice(fromIndex, 1);
      const at = Math.max(0, Math.min(insertAt, next.length));
      next.splice(at, 0, item);
      return next;
    };

    if (sectionId === "experience") {
      onPatch((p) => ({ ...p, experience: reorder(p.experience) }));
    } else if (sectionId === "education") {
      onPatch((p) => ({ ...p, education: reorder(p.education) }));
    } else if (sectionId === "projects") {
      onPatch((p) => ({ ...p, projects: reorder(p.projects) }));
    }
  };

  const presentOrder = presentSectionsInOrder(cv);
  const columns = presentByColumn(cv, splitMode);
  const useTwoColumns =
    splitMode !== "single" || columns.right.length > 0 || Object.keys(cv.sectionColumns || {}).length > 0;

  const shellProps = {
    activeKey,
    onActivate: activate,
    onDelete: handleDelete,
    onAiImprove: handleAiImprove,
    onDropOnSection: handleDropSection,
    onDropOnEntry: handleDropEntry,
    aiBusy,
    aiError: aiErr,
  };

  const addEntryAfter = (sectionId: string, afterIndex: number) => {
    onPatch((p) => {
      if (sectionId === "experience") {
        const experience = [...p.experience];
        experience.splice(afterIndex + 1, 0, {
          company: "Company",
          title: "Job title",
          start: "2023",
          end: "Present",
          bullets: ["Describe a strong achievement…"],
        });
        return { ...p, experience };
      }
      if (sectionId === "education") {
        const education = [...p.education];
        education.splice(afterIndex + 1, 0, {
          school: "School / University",
          degree: "Degree",
          year: "2024",
        });
        return { ...p, education };
      }
      if (sectionId === "projects") {
        const projects = [...p.projects];
        projects.splice(afterIndex + 1, 0, {
          name: "Project name",
          description: "What you built and the impact…",
        });
        return { ...p, projects };
      }
      return p;
    });
    setActiveKey(`entry:${sectionId}:${afterIndex + 1}`);
  };

  const shellFor = (target: SectionActionTarget) => {
    const isBody =
      target.scope === "section" && !["personal", "contact"].includes(target.sectionId);
    const isEntry = target.scope === "entry";
    const isMultiEntry =
      target.sectionId === "experience" ||
      target.sectionId === "education" ||
      target.sectionId === "projects";

    let onInsertSection: (() => void) | undefined;
    if (isEntry && isMultiEntry) {
      onInsertSection = () => addEntryAfter(target.sectionId, target.index);
    } else if (isBody && isMultiEntry) {
      const count =
        target.sectionId === "experience"
          ? cv.experience.length
          : target.sectionId === "education"
            ? cv.education.length
            : cv.projects.length;
      if (count === 0) {
        onInsertSection = () => addEntryAfter(target.sectionId, -1);
      } else if (missingSections.length > 0) {
        // Parent “+” adds a new section type; CSS offsets it below entry “+”s.
        onInsertSection = () => setPickerOpen(true);
      }
    } else if (isBody && missingSections.length > 0) {
      onInsertSection = () => setPickerOpen(true);
    }

    return {
      ...shellProps,
      target,
      onInsertSection,
    };
  };

  useEffect(() => {
    const onDoc = (e: globalThis.MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest?.(".cv-section-shell")) return;
      if (t.closest?.(".section-picker")) return;
      if (t.closest?.(".cv-section-insert-btn")) return;
      if (t.closest?.(".cv-empty-add")) return;
      setFocusAi(null);
      setActiveKey(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const isSplitChrome =
    isSidebar || isMagazine || isFolio || isAurora || isFrame || isPortrait || isSpotlight || isMedallion;

  const contentStyle: CSSProperties = {
    background: isCards ? `linear-gradient(180deg, ${theme.accentSoft} 0%, #fff 45%)` : "#fff",
    color: "#1a1a1a",
    lineHeight: 1.45,
    overflow: "visible",
    width: A4_WIDTH_PX,
    maxWidth: A4_WIDTH_PX,
    boxSizing: "border-box",
    position: "relative",
    ...(isFrame ? { padding: "0.85rem", background: theme.accentSoft } : {}),
    ...(isSidebar || isMagazine
      ? {
          display: "grid",
          gridTemplateColumns: isMagazine
            ? "minmax(0,28%) minmax(0,1fr)"
            : "minmax(0,34%) minmax(0,1fr)",
          alignItems: "stretch",
          // Transparent so the page shell rail stripe shows through.
          background: "transparent",
        }
      : {}),
    ...(!isSplitChrome ? { padding: compact ? "1rem" : "1.35rem 1.5rem", fontSize: compact ? "0.82rem" : "0.9rem" } : {}),
  };

  const setPhoto = (photo: string | undefined) => {
    onPatch((p) => ({
      ...p,
      personal: { ...p.personal, photo },
    }));
  };

  const photoSlot = showPhotoSlot ? (
    <CvPhotoSlot
      photo={cv.personal.photo}
      onChange={setPhoto}
      accent={theme.accent}
      size={isMedallion ? 108 : isSpotlight ? 112 : 96}
      shape={isSpotlight ? "rounded" : "circle"}
      dark={isSpotlight}
      label={cv.personal.photo ? "Photo" : "Add photo"}
    />
  ) : null;

  const nameBlock = (
    <SectionShell
      {...shellFor({ scope: "section", sectionId: "personal", label: "Header" })}
    >
      <EditableText
        value={cv.personal.fullName}
        placeholder="Your Name"
        style={{
          fontSize: isMagazine ? "1.35rem" : compact ? "1.2rem" : "1.55rem",
          fontWeight: 800,
          color: isSidebar || isMagazine || isSpotlight ? "inherit" : theme.accent,
          display: "block",
          ...wrap,
        }}
        onCommit={(v) => onPatch((p) => ({ ...p, personal: { ...p.personal, fullName: v } }))}
        onFocusField={bindFocus("personal")}
      />
    </SectionShell>
  );

  /** Light paper / soft headers need dark ink; dark rails inherit light rail text. */
  const contactOnDarkRail = isSidebar || isMagazine;
  const contactInk = contactOnDarkRail ? "inherit" : "#1e293b";

  const contactActive = activeKey === "section:contact";
  const hasContact =
    !!cv.personal.email.trim() ||
    !!cv.personal.phone.trim() ||
    !!cv.personal.location.trim() ||
    cv.personal.links.some((l) => l.trim());

  const showEmail = contactActive || !!cv.personal.email.trim();
  const showPhone = contactActive || !!cv.personal.phone.trim();
  const showLocation = contactActive || !!cv.personal.location.trim();
  const showLinks = contactActive || cv.personal.links.some((l) => l.trim());

  const setFieldHref = (key: "email" | "phone" | "location", next: string) => {
    onPatch((p) => {
      const hrefs = { ...(p.personal.hrefs || {}) };
      if (next.trim()) hrefs[key] = next.trim();
      else delete hrefs[key];
      const hasAny =
        !!hrefs.email || !!hrefs.phone || !!hrefs.location || (hrefs.links || []).some(Boolean);
      return {
        ...p,
        personal: { ...p.personal, hrefs: hasAny ? hrefs : undefined },
      };
    });
  };

  const setLinkAt = (index: number, value: string) => {
    onPatch((p) => {
      const texts = [...p.personal.links];
      while (texts.length <= index) texts.push("");
      texts[index] = value.trim();
      const prevHrefs = [...(p.personal.hrefs?.links || [])];
      while (prevHrefs.length < texts.length) prevHrefs.push("");
      const kept = texts
        .map((text, i) => ({ text, href: prevHrefs[i] || "" }))
        .filter((row) => row.text);
      const hrefs = { ...(p.personal.hrefs || {}) };
      hrefs.links = kept.map((row) => row.href);
      if (!hrefs.links.some(Boolean)) delete hrefs.links;
      const hasAny =
        !!hrefs.email || !!hrefs.phone || !!hrefs.location || (hrefs.links || []).some(Boolean);
      return {
        ...p,
        personal: {
          ...p.personal,
          links: kept.map((row) => row.text),
          hrefs: hasAny ? hrefs : undefined,
        },
      };
    });
  };

  const setLinkHrefAt = (index: number, next: string) => {
    onPatch((p) => {
      const hrefs = { ...(p.personal.hrefs || {}) };
      const count = Math.max(p.personal.links.length, index + 1, (hrefs.links || []).length);
      const list = Array.from({ length: count }, (_, i) => hrefs.links?.[i] || "");
      list[index] = next.trim();
      hrefs.links = list;
      if (!hrefs.links.some(Boolean)) delete hrefs.links;
      const hasAny =
        !!hrefs.email || !!hrefs.phone || !!hrefs.location || (hrefs.links || []).some(Boolean);
      return {
        ...p,
        personal: { ...p.personal, hrefs: hasAny ? hrefs : undefined },
      };
    });
  };

  const addLinkSlot = () => {
    onPatch((p) => ({
      ...p,
      personal: {
        ...p.personal,
        links: [...p.personal.links.filter(Boolean), ""],
      },
    }));
  };

  const linkSlots =
    showLinks
      ? contactActive
        ? cv.personal.links.length
          ? cv.personal.links
          : [""]
        : cv.personal.links.filter((l) => l.trim())
      : [];

  const linkPlaceholder = (i: number) =>
    i === 0 ? "LinkedIn / GitHub…" : i === 1 ? "Behance / portfolio…" : `link ${i + 1}`;

  const contactLine = (
    <SectionShell {...shellFor({ scope: "section", sectionId: "contact", label: "Contact" })}>
      <div
        className="cv-contact-inline"
        style={{
          color: isAurora || isSpotlight ? "inherit" : contactInk,
          fontWeight: 550,
        }}
      >
        {showEmail && (
          <LinkedContactField
            value={cv.personal.email}
            href={cv.personal.hrefs?.email}
            hrefHint="email"
            placeholder="email"
            style={{ color: "inherit" }}
            onCommit={(v) => onPatch((p) => ({ ...p, personal: { ...p.personal, email: v } }))}
            onHrefCommit={(v) => setFieldHref("email", v)}
            onFocusField={bindFocus("personal")}
          />
        )}
        {showEmail && (showPhone || showLocation || linkSlots.length > 0) ? (
          <span className="cv-contact-sep" aria-hidden>
            ·
          </span>
        ) : null}
        {showPhone && (
          <LinkedContactField
            value={cv.personal.phone}
            href={cv.personal.hrefs?.phone}
            hrefHint="phone"
            placeholder="phone"
            style={{ color: "inherit" }}
            onCommit={(v) => onPatch((p) => ({ ...p, personal: { ...p.personal, phone: v } }))}
            onHrefCommit={(v) => setFieldHref("phone", v)}
            onFocusField={bindFocus("personal")}
          />
        )}
        {showPhone && (showLocation || linkSlots.length > 0) ? (
          <span className="cv-contact-sep" aria-hidden>
            ·
          </span>
        ) : null}
        {showLocation && (
          <LinkedContactField
            value={cv.personal.location}
            href={cv.personal.hrefs?.location}
            hrefHint="web"
            placeholder="location"
            style={{ color: "inherit" }}
            onCommit={(v) => onPatch((p) => ({ ...p, personal: { ...p.personal, location: v } }))}
            onHrefCommit={(v) => setFieldHref("location", v)}
            onFocusField={bindFocus("personal")}
          />
        )}
        {linkSlots.map((link, i) => (
          <Fragment key={`link-${i}`}>
            {(i > 0 || showEmail || showPhone || showLocation) && (
              <span className="cv-contact-sep" aria-hidden>
                ·
              </span>
            )}
            <LinkedContactField
              value={link}
              href={cv.personal.hrefs?.links?.[i]}
              hrefHint="web"
              placeholder={linkPlaceholder(i)}
              style={{ color: "inherit" }}
              onCommit={(v) => setLinkAt(i, v)}
              onHrefCommit={(v) => setLinkHrefAt(i, v)}
              onFocusField={bindFocus("personal")}
            />
          </Fragment>
        ))}
        {contactActive && linkSlots.length < 8 && (
          <button
            type="button"
            className="cv-contact-add-link"
            title="Add another link"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              addLinkSlot();
            }}
          >
            + link
          </button>
        )}
        {!contactActive && !hasContact && <span className="cv-contact-empty-hint">Add contact</span>}
      </div>
    </SectionShell>
  );

  const contactStack = (
    <SectionShell {...shellFor({ scope: "section", sectionId: "contact", label: "Contact" })}>
      <div
        className="cv-contact-stack"
        style={{ fontSize: "0.78rem", marginTop: 4, color: contactInk, fontWeight: 550, ...wrap }}
      >
        {showEmail && (
          <LinkedContactField
            value={cv.personal.email}
            href={cv.personal.hrefs?.email}
            hrefHint="email"
            placeholder="email"
            style={{ display: "block", marginBottom: 4, color: "inherit" }}
            onCommit={(v) => onPatch((p) => ({ ...p, personal: { ...p.personal, email: v } }))}
            onHrefCommit={(v) => setFieldHref("email", v)}
            onFocusField={bindFocus("personal")}
          />
        )}
        {showPhone && (
          <LinkedContactField
            value={cv.personal.phone}
            href={cv.personal.hrefs?.phone}
            hrefHint="phone"
            placeholder="phone"
            style={{ display: "block", marginBottom: 4, color: "inherit" }}
            onCommit={(v) => onPatch((p) => ({ ...p, personal: { ...p.personal, phone: v } }))}
            onHrefCommit={(v) => setFieldHref("phone", v)}
            onFocusField={bindFocus("personal")}
          />
        )}
        {showLocation && (
          <LinkedContactField
            value={cv.personal.location}
            href={cv.personal.hrefs?.location}
            hrefHint="web"
            placeholder="location"
            style={{ display: "block", marginBottom: 4, color: "inherit" }}
            onCommit={(v) => onPatch((p) => ({ ...p, personal: { ...p.personal, location: v } }))}
            onHrefCommit={(v) => setFieldHref("location", v)}
            onFocusField={bindFocus("personal")}
          />
        )}
        {linkSlots.map((link, i) => (
          <LinkedContactField
            key={`stack-link-${i}`}
            value={link}
            href={cv.personal.hrefs?.links?.[i]}
            hrefHint="web"
            placeholder={linkPlaceholder(i)}
            style={{ display: "block", marginBottom: 4, color: "inherit" }}
            onCommit={(v) => setLinkAt(i, v)}
            onHrefCommit={(v) => setLinkHrefAt(i, v)}
            onFocusField={bindFocus("personal")}
          />
        ))}
        {contactActive && linkSlots.length < 8 && (
          <button
            type="button"
            className="cv-contact-add-link"
            title="Add another link"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              addLinkSlot();
            }}
          >
            + Add link
          </button>
        )}
        {!contactActive && !hasContact && <p className="cv-contact-empty-hint">Add contact</p>}
      </div>
    </SectionShell>
  );

  const summaryBlock = sectionIsPresent(cv, "summary") ? (
    <SectionShell
      {...shellFor({ scope: "section", sectionId: "summary", label: "Summary" })}
      style={{ marginTop: isFolio || isAurora || isSidebar ? "0.85rem" : "0.9rem" }}
    >
      <SectionTitle accent={theme.accent}>
        {isAurora ? "About" : isFolio ? "Summary" : "Professional Summary"}
      </SectionTitle>
      <EditableText
        value={cv.summary}
        multiline
        placeholder="Write a short professional summary…"
        style={{ display: "block", minHeight: "3em" }}
        onCommit={(v) => onPatch((p) => ({ ...p, summary: v }))}
        onFocusField={bindFocus("summary")}
      />
    </SectionShell>
  ) : null;

  const experienceBlock = sectionIsPresent(cv, "experience") ? (
    <SectionShell
      {...shellFor({ scope: "section", sectionId: "experience", label: "Experience" })}
      style={{ marginTop: "0.9rem" }}
    >
      <SectionTitle accent={theme.accent}>Experience</SectionTitle>
      {cv.experience.map((job, i) => (
        <SectionShell
          key={i}
          {...shellFor({ scope: "entry", sectionId: "experience", index: i, label: "Role" })}
          className="cv-entry-shell"
          style={{
            marginBottom: "0.75rem",
            paddingLeft: kind === "timeline" ? "0.85rem" : 0,
            borderLeft: kind === "timeline" ? `2px solid ${theme.accentSoft}` : undefined,
          }}
        >
          <EditableText
            value={[job.title, job.company].filter(Boolean).join(" — ")}
            placeholder="Title — Company"
            style={{ fontWeight: 700, display: "block", color: theme.accent }}
            onCommit={(v) => {
              const [title, ...rest] = v.split("—").map((s) => s.trim());
              onPatch((p) => {
                const experience = [...p.experience];
                experience[i] = { ...experience[i], title: title || "", company: rest.join(" — ") };
                return { ...p, experience };
              });
            }}
            onFocusField={bindFocus("experience")}
          />
          <EditableText
            value={[job.start, job.end].filter(Boolean).join(" – ")}
            placeholder="Start – End"
            style={{ fontSize: "0.76rem", color: "#334155", display: "block", fontWeight: 550 }}
            onCommit={(v) => {
              const [start, end] = v.split("–").map((s) => s.trim());
              onPatch((p) => {
                const experience = [...p.experience];
                experience[i] = { ...experience[i], start: start || "", end: end || "" };
                return { ...p, experience };
              });
            }}
            onFocusField={bindFocus("experience")}
          />
          <EditableText
            value={job.bullets.join("\n")}
            multiline
            placeholder={"• Bullet 1\n• Bullet 2"}
            style={{ display: "block", marginTop: 4, minHeight: "2.5em" }}
            onCommit={(v) =>
              onPatch((p) => {
                const experience = [...p.experience];
                experience[i] = {
                  ...experience[i],
                  bullets: v.split("\n").map((s) => s.replace(/^[-•*]\s*/, "").trimEnd()),
                };
                return { ...p, experience };
              })
            }
            onFocusField={bindFocus("experience")}
          />
        </SectionShell>
      ))}
    </SectionShell>
  ) : null;

  const educationBlock = sectionIsPresent(cv, "education") ? (
    <SectionShell
      {...shellFor({ scope: "section", sectionId: "education", label: "Education" })}
      style={{ marginTop: "0.9rem" }}
    >
      <SectionTitle accent={theme.accent}>Education</SectionTitle>
      {cv.education.map((ed, i) => (
        <SectionShell
          key={i}
          {...shellFor({ scope: "entry", sectionId: "education", index: i, label: "Education entry" })}
          className="cv-entry-shell"
          style={{ marginBottom: "0.45rem" }}
        >
          <EditableText
            value={[ed.degree, ed.school, ed.year].filter(Boolean).join(" · ")}
            placeholder="Degree · School · Year"
            style={{ display: "block", fontWeight: 650 }}
            onCommit={(v) => {
              const parts = v.split("·").map((s) => s.trim());
              onPatch((p) => {
                const education = [...p.education];
                education[i] = {
                  ...education[i],
                  degree: parts[0] || "",
                  school: parts[1] || "",
                  year: parts[2] || "",
                };
                return { ...p, education };
              });
            }}
            onFocusField={bindFocus("education")}
          />
        </SectionShell>
      ))}
    </SectionShell>
  ) : null;

  const projectsBlock = sectionIsPresent(cv, "projects") ? (
    <SectionShell
      {...shellFor({ scope: "section", sectionId: "projects", label: "Projects" })}
      style={{ marginTop: "0.9rem" }}
    >
      <SectionTitle accent={theme.accent}>Projects</SectionTitle>
      {cv.projects.map((proj, i) => (
        <SectionShell
          key={i}
          {...shellFor({ scope: "entry", sectionId: "projects", index: i, label: "Project" })}
          className="cv-entry-shell"
          style={{ marginBottom: "0.45rem" }}
        >
          <EditableText
            value={proj.name}
            placeholder="Project name"
            style={{ fontWeight: 700, display: "block" }}
            onCommit={(v) =>
              onPatch((p) => {
                const projects = [...p.projects];
                projects[i] = { ...projects[i], name: v };
                return { ...p, projects };
              })
            }
            onFocusField={bindFocus("projects")}
          />
          <EditableText
            value={proj.description}
            multiline
            placeholder="Description"
            style={{ display: "block", marginTop: 2 }}
            onCommit={(v) =>
              onPatch((p) => {
                const projects = [...p.projects];
                projects[i] = { ...projects[i], description: v };
                return { ...p, projects };
              })
            }
            onFocusField={bindFocus("projects")}
          />
        </SectionShell>
      ))}
    </SectionShell>
  ) : null;

  const listSection = (
    title: string,
    sectionKey: "skills" | "certifications" | "languages" | "awards" | "interests",
    value: string[],
    placeholder: string,
    joinWith = ", ",
  ) =>
    value.length > 0 ? (
      <SectionShell
        {...shellFor({ scope: "section", sectionId: sectionKey, label: title })}
        style={{ marginTop: "0.9rem" }}
      >
        <SectionTitle accent={theme.accent}>{title}</SectionTitle>
        <EditableText
          value={value.join(joinWith)}
          multiline
          placeholder={placeholder}
          style={{ display: "block", minHeight: "1.6em" }}
          onCommit={(v) =>
            onPatch((p) => ({
              ...p,
              [sectionKey]: v
                .split(joinWith.trim() === "," ? /,/ : joinWith.includes("·") ? /\s*·\s*/ : /\n/)
                .map((s) => s.trim())
                .filter(Boolean),
            }))
          }
          onFocusField={bindFocus(sectionKey)}
        />
      </SectionShell>
    ) : null;

  const skillsBlock = listSection(
    "Skills",
    "skills",
    cv.skills,
    "Skill1 · Skill2 · Skill3…",
    " · ",
  );
  const certsBlock = listSection("Certifications", "certifications", cv.certifications, "Cert A, Cert B…");
  const languages = cv.languages ?? [];
  const awards = cv.awards ?? [];
  const interests = cv.interests ?? [];
  const languagesBlock = listSection(
    "Languages",
    "languages",
    languages,
    "English · Urdu…",
    " · ",
  );
  const awardsBlock = listSection("Awards", "awards", awards, "Award title…");
  const interestsBlock = listSection(
    "Interests",
    "interests",
    interests,
    "Interest 1 · Interest 2…",
    " · ",
  );

  const blockMap: Partial<Record<BodySectionId, ReactNode>> = {
    summary: summaryBlock,
    skills: skillsBlock,
    experience: experienceBlock,
    education: educationBlock,
    projects: projectsBlock,
    certifications: certsBlock,
    languages: languagesBlock,
    awards: awardsBlock,
    interests: interestsBlock,
  };

  const emptyAdd = (
    <div className="cv-empty-add">
      <button
        type="button"
        className="cv-section-insert-btn"
        aria-label="Add section"
        onClick={() => setPickerOpen(true)}
      >
        +
      </button>
      <span>Add section</span>
    </div>
  );

  const renderLane = (ids: BodySectionId[], column: "left" | "right") => (
    <div
      className={`cv-column-lane cv-column-lane--${column}${laneDrop === column ? " is-drop-target" : ""}`}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes("text/section-id")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (laneDrop !== column) setLaneDrop(column);
      }}
      onDragLeave={(e) => {
        const next = e.relatedTarget as Node | null;
        // relatedTarget is often null mid-drag; only clear when we truly left the lane.
        if (next && e.currentTarget.contains(next)) return;
        if (!next) {
          // Leaving into nowhere / outside window — clear this lane if it's active.
          setLaneDrop((cur) => (cur === column ? null : cur));
          return;
        }
        setLaneDrop((cur) => (cur === column ? null : cur));
      }}
      onDrop={(e) => {
        e.preventDefault();
        setLaneDrop(null);
        const draggedId = e.dataTransfer.getData("text/section-id");
        if (!isBodySectionId(draggedId)) return;
        onPatch((p) => moveSectionColumn(p, draggedId, column, splitMode));
      }}
    >
      {ids.map((id) => (
        <Fragment key={id}>{blockMap[id]}</Fragment>
      ))}
      {!ids.length && emptyAdd}
    </div>
  );

  const orderedBlocks = presentOrder
    .map((id) => {
      const block = blockMap[id];
      return block ? <Fragment key={id}>{block}</Fragment> : null;
    })
    .filter(Boolean);
  const mainColumn = useTwoColumns ? (
    <div className="cv-split-body">
      {renderLane(columns.left, "left")}
      {renderLane(columns.right, "right")}
    </div>
  ) : presentOrder.length ? (
    <>{orderedBlocks}</>
  ) : (
    emptyAdd
  );

  let body: ReactNode;

  if (isSidebar || isMagazine) {
    body = (
      <>
        <aside
          className="cv-sidebar-rail"
          style={{
            background: isMagazine ? theme.accent : theme.railBg,
            color: isMagazine ? "#fff" : theme.railText,
            padding: "1.2rem 0.9rem 1.4rem",
            minWidth: 0,
            minHeight: "100%",
            height: "100%",
            alignSelf: "stretch",
            overflow: "visible",
          }}
        >
          {nameBlock}
          {contactStack}
          {renderLane(columns.left, "left")}
        </aside>
        <div
          className="cv-sidebar-main"
          style={{
            padding: "1.15rem 1.25rem",
            minWidth: 0,
            overflow: "visible",
            background: "#fff",
            minHeight: "100%",
            alignSelf: "stretch",
          }}
        >
          {columns.right.length ? renderLane(columns.right, "right") : emptyAdd}
        </div>
      </>
    );
  } else if (isAurora) {
    body = (
      <>
        <header
          style={{
            padding: "1.5rem 1.4rem 1.25rem",
            background: auroraHeaderGradient(theme.accent, theme.accentSoft),
            color: "#0f172a",
          }}
        >
          {nameBlock}
          {contactLine}
        </header>
        <div style={{ padding: "1.15rem 1.25rem", fontSize: "0.86rem" }}>{mainColumn}</div>
      </>
    );
  } else if (isPortrait) {
    body = (
      <>
        <header
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            padding: "1.25rem 1.35rem 1rem",
            borderBottom: `3px solid ${theme.accent}`,
            background: "#fff",
          }}
        >
          {photoSlot}
          <div style={{ flex: 1, minWidth: 0 }}>
            {nameBlock}
            {contactLine}
          </div>
        </header>
        <div style={{ padding: "1.05rem 1.35rem", background: "#fff" }}>{mainColumn}</div>
      </>
    );
  } else if (isSpotlight) {
    body = (
      <>
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "1rem",
            alignItems: "center",
            padding: "1.35rem 1.4rem",
            background: `linear-gradient(120deg, ${theme.accent} 0%, ${theme.accent}cc 70%, ${theme.railBg} 160%)`,
            color: theme.headerText,
          }}
        >
          <div style={{ minWidth: 0 }}>
            {nameBlock}
            <div style={{ color: theme.headerText }}>{contactLine}</div>
          </div>
          {photoSlot}
        </header>
        <div style={{ padding: "1.1rem 1.25rem", fontSize: "0.86rem" }}>{mainColumn}</div>
      </>
    );
  } else if (isMedallion) {
    body = (
      <>
        <header
          style={{
            textAlign: "center",
            padding: "1.35rem 1.25rem 1.05rem",
            background: theme.accentSoft,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.65rem",
          }}
        >
          {photoSlot}
          <div style={{ width: "100%" }}>
            {nameBlock}
            <div
              style={{
                width: 56,
                height: 3,
                background: theme.accent,
                margin: "0.45rem auto 0.5rem",
                borderRadius: 999,
              }}
            />
            {contactLine}
          </div>
        </header>
        <div style={{ padding: "1.05rem 1.3rem", background: "#fff" }}>{mainColumn}</div>
      </>
    );
  } else if (isFolio) {
    body = (
      <>
        <div style={{ height: 12, background: theme.accent, flexShrink: 0 }} />
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)",
            gap: "1rem",
            padding: "1.1rem 1.25rem 0.9rem",
            borderBottom: `1px solid ${theme.accentSoft}`,
            background: "#fff",
          }}
        >
          <div>{nameBlock}</div>
          <div style={{ alignSelf: "center", fontSize: "0.82rem", color: "#1e293b" }}>{contactStack}</div>
        </header>
        <div style={{ padding: "1rem 1.15rem", background: "#fff", fontSize: "0.86rem" }}>{mainColumn}</div>
      </>
    );
  } else if (isRibbon) {
    body = (
      <div style={{ display: "flex", minHeight: "100%", alignSelf: "stretch" }}>
        <div
          aria-hidden
          style={{
            width: 14,
            flexShrink: 0,
            background: theme.accent,
            alignSelf: "stretch",
            minHeight: "100%",
          }}
        />
        <div style={{ flex: 1, minWidth: 0, padding: "1.15rem 1.2rem", background: "#fff" }}>
          <header style={{ marginBottom: "0.85rem" }}>
            {nameBlock}
            <div
              style={{
                height: 2,
                width: 72,
                background: theme.accent,
                margin: "0.4rem 0 0.45rem",
                borderRadius: 2,
              }}
            />
            {contactLine}
          </header>
          {mainColumn}
        </div>
      </div>
    );
  } else if (isCrest) {
    body = (
      <>
        <header
          style={{
            textAlign: "center",
            padding: "1.4rem 1.35rem 1.05rem",
            background: theme.accentSoft,
          }}
        >
          <div
            style={{
              width: 52,
              height: 5,
              background: theme.accent,
              margin: "0 auto 0.7rem",
              borderRadius: 999,
            }}
          />
          {nameBlock}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              margin: "0.55rem auto 0.5rem",
              maxWidth: 280,
            }}
          >
            <span style={{ flex: 1, height: 1, background: theme.accent, opacity: 0.55 }} />
            <span
              style={{
                fontSize: "0.62rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: theme.accent,
                fontWeight: 750,
              }}
            >
              Resume
            </span>
            <span style={{ flex: 1, height: 1, background: theme.accent, opacity: 0.55 }} />
          </div>
          {contactLine}
        </header>
        <div style={{ padding: "1.05rem 1.25rem", background: "#fff" }}>{mainColumn}</div>
      </>
    );
  } else if (isFrame) {
    body = (
      <div
        style={{
          background: "#fff",
          border: `2px solid ${theme.accent}`,
          padding: "1.2rem 1.3rem",
          minHeight: 480,
          position: "relative",
        }}
      >
        <header style={{ textAlign: "center", marginBottom: "0.75rem" }}>
          {nameBlock}
          {contactLine}
        </header>
        {mainColumn}
      </div>
    );
  } else {
    body = (
      <>
        <header
          style={{
            textAlign: kind === "executive" ? "left" : "center",
            marginBottom: "0.75rem",
            ...(kind === "executive"
              ? { borderBottom: `3px solid ${theme.accent}`, paddingBottom: "0.75rem" }
              : {}),
          }}
        >
          {nameBlock}
          {kind !== "executive" && (
            <div
              style={{
                height: 2,
                width: 64,
                background: theme.accent,
                margin: "0.4rem auto 0.45rem",
                borderRadius: 2,
              }}
            />
          )}
          {contactLine}
        </header>
        {mainColumn}
      </>
    );
  }

  const pageShellStyle: CSSProperties | undefined =
    isSidebar || isMagazine
      ? {
          background: isMagazine
            ? `linear-gradient(90deg, ${theme.accent} 0%, ${theme.accent} 28%, #fff 28%, #fff 100%)`
            : `linear-gradient(90deg, ${theme.railBg} 0%, ${theme.railBg} 34%, #ffffff 34%, #ffffff 100%)`,
        }
      : isRibbon
        ? {
            background: `linear-gradient(90deg, ${theme.accent} 0%, ${theme.accent} 14px, #ffffff 14px, #ffffff 100%)`,
          }
        : undefined;

  const railPaint =
    isSidebar || isMagazine
      ? {
          width: isMagazine ? "28%" : "34%",
          background: isMagazine ? theme.accent : theme.railBg,
        }
      : isRibbon
        ? {
            width: "14px",
            background: theme.accent,
          }
        : undefined;

  return (
    <div
      className={`direct-edit-root preview-canvas-wrap${activeKey ? " has-section-selection" : ""}`}
    >
      <CvA4Pages
        key={templateId}
        contentStyle={contentStyle}
        onPageMetaChange={onPageMetaChange}
        onDuplicatePage={duplicatePageContent}
        onPrepareNewPage={prepareNewPageContent}
        onDeletePageContent={deletePageContent}
        pageShellStyle={pageShellStyle}
        railPaint={railPaint}
        zoom={zoom}
      >
        {body}
      </CvA4Pages>

      {pickerOpen && (
        <div className="section-picker" role="dialog" aria-label="Choose a section to add">
          <button type="button" className="section-picker-backdrop" aria-label="Close" onClick={() => setPickerOpen(false)} />
          <div className="section-picker-card">
            <header className="section-picker-head">
              <div>
                <h3>Add a section</h3>
                <p>
                  {missingSections.length
                    ? "Only sections not yet on your resume are listed."
                    : "Every section type is already on this resume."}
                </p>
              </div>
              <button type="button" className="editor-panel-close" onClick={() => setPickerOpen(false)} aria-label="Close">
                ×
              </button>
            </header>
            {missingSections.length ? (
              <div className="section-picker-grid">
                {missingSections.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="section-template-tile"
                    onClick={() => addFromTemplate(tpl.id)}
                  >
                    <span className="section-template-icon" aria-hidden>
                      {tpl.icon}
                    </span>
                    <strong>{tpl.label}</strong>
                    <span>{tpl.blurb}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="section-picker-empty">Nothing left to add. Use each section’s + to add another entry.</p>
            )}
          </div>
        </div>
      )}

      <p className="direct-edit-hint">Drag ⠿ on the left to move · Add · Format · AI · Delete</p>
    </div>
  );
}
