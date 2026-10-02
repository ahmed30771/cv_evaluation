"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { TemplateThumb } from "@/components/cv-templates/CvTemplatePreview";
import type { Finding, Report, StructuredCv, TemplateId } from "@/lib/api";
import type { BodySectionId } from "@/lib/cv-types";
import {
  COLOR_PALETTES,
  COLOR_THEME_IDS,
  LIVE_CUSTOM_THEME_ID,
  TEMPLATES,
  TEMPLATE_DEFAULT_COLOR,
  buildLiveCustomPalette,
  findColorPalette,
  normalizeHexColor,
  type CustomColorPalette,
} from "@/lib/templates";
import { TEMPLATE_PREVIEW_SAMPLE } from "@/lib/template-preview-sample";
import { scoreToGrade } from "@/lib/score-grade";
import { presentByColumn, sectionLabel } from "@/lib/section-order";
import {
  indentSelection,
  runExecCommand,
  startFormatSelectionTracking,
  toggleBulletSelection,
  toggleNumberedSelection,
  transformSelectedCase,
} from "@/lib/text-format";

export type EditorPanel =
  | "fix"
  | "tailor"
  | "templates"
  | "design"
  | "format"
  | "rearrange"
  | "history"
  | null;

function ColorStrip({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const hex = normalizeHexColor(value) || "#1a4f7a";
  const light = isLightHex(hex);
  const inputId = `theme-strip-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <label
      htmlFor={inputId}
      className={`theme-color-strip${light ? " is-light" : ""}`}
      title={`${label}: ${hex}`}
    >
      <i style={{ background: hex }} aria-hidden />
      <span className="theme-color-strip-label">{label}</span>
      <input
        id={inputId}
        type="color"
        value={hex}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function isLightHex(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

export function SidePanel({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const [sheetH, setSheetH] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const sheetHRef = useRef<number | null>(null);
  const drag = useRef<{ startY: number; startH: number; startT: number } | null>(null);

  const readAvail = () => {
    const parent = panelRef.current?.parentElement;
    return parent?.clientHeight ?? Math.round(window.innerHeight * 0.85);
  };

  const snaps = (avail: number) => ({
    full: Math.round(avail * 0.94),
    mid: Math.round(avail * 0.5),
    dismiss: Math.round(avail * 0.22),
  });

  useEffect(() => {
    sheetHRef.current = sheetH;
  }, [sheetH]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const apply = () => {
      if (!mq.matches) {
        sheetHRef.current = null;
        setSheetH(null);
        return;
      }
      const { mid, full } = snaps(readAvail());
      setSheetH((prev) => {
        const next = prev == null ? mid : Math.abs(prev - full) < Math.abs(prev - mid) ? full : mid;
        sheetHRef.current = next;
        return next;
      });
    };
    apply();
    mq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  function onShutterPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!window.matchMedia("(max-width: 860px)").matches) return;
    e.preventDefault();
    const avail = readAvail();
    const h = sheetHRef.current ?? snaps(avail).mid;
    drag.current = { startY: e.clientY, startH: h, startT: performance.now() };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onShutterPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.startY;
    const { full } = snaps(readAvail());
    const next = Math.max(0, Math.min(full, drag.current.startH - dy));
    sheetHRef.current = next;
    setSheetH(next);
  }

  function finishDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const { full, mid, dismiss } = snaps(readAvail());
    const h = sheetHRef.current ?? mid;
    const totalDy = e.clientY - drag.current.startY;
    const totalDt = Math.max(1, performance.now() - drag.current.startT);
    const velocity = totalDy / totalDt;
    const wasTap = Math.abs(totalDy) < 10;
    drag.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    if (wasTap) {
      if (h >= (full + mid) / 2) {
        sheetHRef.current = mid;
        setSheetH(mid);
      } else {
        onClose();
      }
      return;
    }

    if (h <= dismiss || (h < mid * 0.72 && velocity > 0.35)) {
      onClose();
      return;
    }

    const next = Math.abs(h - full) < Math.abs(h - mid) ? full : mid;
    sheetHRef.current = next;
    setSheetH(next);
  }

  return (
    <aside
      ref={panelRef}
      className={`editor-side-panel ${wide ? "is-wide" : ""}${dragging ? " is-dragging" : ""}`}
      role="dialog"
      aria-label={title}
      style={sheetH != null ? { height: sheetH, maxHeight: sheetH } : undefined}
    >
      <button
        type="button"
        className="editor-panel-shutter"
        onPointerDown={onShutterPointerDown}
        onPointerMove={onShutterPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClick={() => {
          if (!window.matchMedia("(max-width: 860px)").matches) onClose();
        }}
        title="Drag to resize"
        aria-label="Drag shutter to resize panel"
      >
        <span className="editor-panel-shutter-grip" aria-hidden />
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 9.5 12 15.5 18 9.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <header className="editor-side-panel-head">
        <h2>{title}</h2>
      </header>
      <div className="editor-side-panel-body">{children}</div>
      <button
        type="button"
        className="editor-side-panel-collapse"
        onClick={onClose}
        title="Collapse panel"
        aria-label="Collapse panel"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M14.5 5.5 8 12l6.5 6.5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </aside>
  );
}

export function FixResumePanel({
  report,
  loading,
  error,
  onRefresh,
  onClose,
}: {
  report: Report | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const scores = report?.scores;
  const grade = scores ? scoreToGrade(scores.overall) : "—";
  const findings = report?.findings ?? [];
  const issues = findings.filter((f) => f.type === "issue" || f.type === "missing" || f.type === "improvement");
  const strengths = findings.filter((f) => f.type === "strength" || f.type === "recommendation");

  return (
    <SidePanel title="Fix Resume" onClose={onClose}>
      <div className="fix-score-hero">
        <div className="fix-grade">{grade}</div>
        <div>
          <strong>{scores ? `${scores.overall}/100` : "Not scored yet"}</strong>
          <p>Run a check to get actionable fixes ranked by impact.</p>
        </div>
      </div>
      {scores && (
        <ul className="fix-score-list">
          {(
            [
              ["ATS", scores.ats],
              ["Experience", scores.experience],
              ["Skills", scores.skills],
              ["Content", scores.content],
              ["Formatting", scores.formatting],
            ] as const
          ).map(([label, value]) => (
            <li key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn-primary" style={{ width: "100%" }} disabled={loading} onClick={onRefresh}>
        {loading ? "Scoring…" : report ? "Re-check resume" : "Score this resume"}
      </button>
      {error && <p className="editor-panel-error">{error}</p>}
      {!!issues.length && (
        <section className="fix-findings">
          <h3>Fix these</h3>
          {issues.slice(0, 12).map((f, i) => (
            <FindingCard key={`i-${i}`} finding={f} tone="bad" />
          ))}
        </section>
      )}
      {!!strengths.length && (
        <section className="fix-findings">
          <h3>Working well</h3>
          {strengths.slice(0, 6).map((f, i) => (
            <FindingCard key={`s-${i}`} finding={f} tone="good" />
          ))}
        </section>
      )}
    </SidePanel>
  );
}

function FindingCard({ finding, tone }: { finding: Finding; tone: "bad" | "good" }) {
  return (
    <article className={`fix-finding fix-finding--${tone}`}>
      <strong>{finding.title}</strong>
      <p>{finding.detail}</p>
      {finding.section ? <em>{finding.section}</em> : null}
    </article>
  );
}

export function TailorPanel({
  jobText,
  onJobText,
  busy,
  error,
  suggestions,
  onRun,
  onApplySummary,
  onApplySkills,
  rewriteBusy,
  rewriteError,
  onRewrite,
  onClose,
}: {
  jobText: string;
  onJobText: (v: string) => void;
  busy: boolean;
  error: string | null;
  suggestions: {
    matchNote: string;
    summary?: string;
    skills?: string;
    bullets: string[];
  } | null;
  onRun: () => void;
  onApplySummary: (text: string) => void;
  onApplySkills: (text: string) => void;
  rewriteBusy: boolean;
  rewriteError: string | null;
  onRewrite: () => void;
  onClose: () => void;
}) {
  return (
    <SidePanel title="Rewrite & Tailor" onClose={onClose} wide>
      <section className="tailor-section">
        <h3 className="tailor-section-title">Full AI rewrite</h3>
        <p className="editor-panel-lead">
          Rewrite the whole resume with stronger wording. Review the canvas after — you can undo from History.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "100%" }}
          disabled={rewriteBusy || busy}
          onClick={onRewrite}
        >
          {rewriteBusy ? "Rewriting…" : "Rewrite resume"}
        </button>
        {rewriteError && <p className="editor-panel-error">{rewriteError}</p>}
      </section>

      <div className="tailor-divider" role="separator" />

      <section className="tailor-section">
        <h3 className="tailor-section-title">Tailor to a job</h3>
        <p className="editor-panel-lead">
          Paste a job description. We compare your CV and suggest targeted edits — nothing is applied until you accept.
        </p>
        <label className="editor-field-label" htmlFor="tailor-jd">
          Job description
        </label>
        <textarea
          id="tailor-jd"
          className="editor-textarea"
          rows={10}
          value={jobText}
          onChange={(e) => onJobText(e.target.value)}
          placeholder="Paste the full job post here…"
        />
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "100%", marginTop: "0.65rem" }}
          disabled={busy || rewriteBusy || jobText.trim().length < 40}
          onClick={onRun}
        >
          {busy ? "Checking…" : "Check match & tailor"}
        </button>
        {error && <p className="editor-panel-error">{error}</p>}
        {suggestions && (
          <div className="tailor-results">
            <p className="tailor-note">{suggestions.matchNote}</p>
            {suggestions.summary && (
              <div className="tailor-block">
                <header>
                  <strong>Suggested summary</strong>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: "0.25rem 0.55rem", fontSize: "0.78rem" }}
                    onClick={() => onApplySummary(suggestions.summary!)}
                  >
                    Apply
                  </button>
                </header>
                <p>{suggestions.summary}</p>
              </div>
            )}
            {suggestions.skills && (
              <div className="tailor-block">
                <header>
                  <strong>Suggested skills line</strong>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: "0.25rem 0.55rem", fontSize: "0.78rem" }}
                    onClick={() => onApplySkills(suggestions.skills!)}
                  >
                    Apply
                  </button>
                </header>
                <p>{suggestions.skills}</p>
              </div>
            )}
            {!!suggestions.bullets.length && (
              <div className="tailor-block">
                <strong>Bullet ideas</strong>
                <ul>
                  {suggestions.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
                <p className="editor-panel-hint">Copy ideas into experience bullets on the CV.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </SidePanel>
  );
}

export function TemplatesPanel({
  templateId,
  preference,
  colorThemeId,
  customThemes,
  onPreference,
  onPick,
  onClose,
}: {
  cv: StructuredCv;
  templateId: TemplateId;
  preference: "ats" | "visual";
  colorThemeId: string | null;
  customThemes?: CustomColorPalette[];
  onPreference: (p: "ats" | "visual") => void;
  onPick: (id: TemplateId) => void;
  onClose: () => void;
}) {
  const filtered = TEMPLATES.filter((t) =>
    preference === "ats" ? t.badge === "ATS recommended" : t.badge === "Visual",
  );

  function setFilter(next: "ats" | "visual") {
    onPreference(next);
    const list = TEMPLATES.filter((t) =>
      next === "ats" ? t.badge === "ATS recommended" : t.badge === "Visual",
    );
    if (list.length && !list.some((t) => t.id === templateId)) {
      onPick(list[0].id);
    }
  }

  return (
    <SidePanel title="Templates" onClose={onClose} wide>
      <p className="editor-panel-lead">
        Pick a layout structure. Colors stay in Design — change them anytime without switching templates.
      </p>
      <div className="template-filter-row" role="tablist" aria-label="Template style">
        <button
          type="button"
          role="tab"
          aria-selected={preference === "ats"}
          className={`template-filter-btn ${preference === "ats" ? "is-active" : ""}`}
          onClick={() => setFilter("ats")}
        >
          ATS
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={preference === "visual"}
          className={`template-filter-btn ${preference === "visual" ? "is-active" : ""}`}
          onClick={() => setFilter("visual")}
        >
          Visual
        </button>
      </div>
      <div className="template-mini-grid template-mini-grid--panel">
        {filtered.map((t) => (
          <TemplateThumb
            key={t.id}
            cv={TEMPLATE_PREVIEW_SAMPLE}
            templateId={t.id}
            colorThemeId={colorThemeId}
            customThemes={customThemes}
            label={t.label}
            badge={t.supportsPhoto ? `${t.badge} · Photo` : t.badge}
            active={templateId === t.id}
            onClick={() => onPick(t.id)}
          />
        ))}
      </div>
      {!filtered.length && <p className="editor-panel-hint">No templates in this filter.</p>}
    </SidePanel>
  );
}

export function DesignPanel({
  templateId,
  colorThemeId,
  customThemes,
  onColorTheme,
  onCustomThemesChange,
  onClose,
}: {
  templateId: TemplateId;
  colorThemeId: string | null;
  customThemes: CustomColorPalette[];
  onColorTheme: (id: string | null) => void;
  onCustomThemesChange: (next: CustomColorPalette[]) => void;
  onClose: () => void;
}) {
  const activeId = colorThemeId ?? TEMPLATE_DEFAULT_COLOR[templateId];
  const active =
    findColorPalette(activeId, customThemes) || COLOR_PALETTES[TEMPLATE_DEFAULT_COLOR[templateId]];

  function applyStrip(patch: Partial<Pick<typeof active, "railBg" | "accent" | "accentSoft">>) {
    const live = buildLiveCustomPalette(active, patch);
    const next = [live, ...customThemes.filter((t) => t.id !== LIVE_CUSTOM_THEME_ID)].slice(0, 24);
    onCustomThemesChange(next);
  }

  return (
    <SidePanel title="Design" onClose={onClose}>
      <p className="editor-panel-lead">
        Tap a strip to change that color. Layout structure stays the same.
      </p>

      <h3 className="tailor-section-title">Your colors</h3>
      <div className="color-theme-swatch-preview theme-color-strips" role="group" aria-label="Custom colors">
        <ColorStrip label="Rail" value={active.railBg} onChange={(hex) => applyStrip({ railBg: hex })} />
        <ColorStrip label="Accent" value={active.accent} onChange={(hex) => applyStrip({ accent: hex })} />
        <ColorStrip label="Soft" value={active.accentSoft} onChange={(hex) => applyStrip({ accentSoft: hex })} />
      </div>

      <h3 className="tailor-section-title" style={{ marginTop: "1rem" }}>
        Preset themes
      </h3>
      <div className="color-theme-grid">
        {COLOR_THEME_IDS.map((id) => {
          const p = COLOR_PALETTES[id];
          return (
            <button
              key={id}
              type="button"
              className={`color-theme-swatch ${activeId === id ? "is-active" : ""}`}
              onClick={() => onColorTheme(id)}
              aria-pressed={activeId === id}
              title={p.label}
            >
              <span className="color-theme-swatch-preview" aria-hidden>
                <i style={{ background: p.railBg }} />
                <i style={{ background: p.accent }} />
                <i style={{ background: p.accentSoft }} />
              </span>
              <strong>{p.label}</strong>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ width: "100%", marginTop: "0.85rem" }}
        onClick={() => onColorTheme(null)}
      >
        Reset to template default
      </button>
    </SidePanel>
  );
}

export function RearrangePanel({
  cv,
  split = "single",
  onMoveEntry,
  onMoveSection,
  onMoveColumn,
  onDropRelative,
  onClose,
}: {
  cv: StructuredCv;
  split?: "single" | "aurora" | "banner" | "sidebar";
  onMoveEntry: (section: "experience" | "education" | "projects", from: number, to: number) => void;
  onMoveSection: (sectionId: string, direction: "up" | "down") => void;
  onMoveColumn: (sectionId: string, column: "left" | "right") => void;
  onDropRelative: (draggedId: string, targetId: string, place: "before" | "after") => void;
  onClose: () => void;
}) {
  const { left, right } = presentByColumn(cv, split);
  const [dragId, setDragId] = useState<string | null>(null);

  function ColumnList({ title, ids, column }: { title: string; ids: BodySectionId[]; column: "left" | "right" }) {
    return (
      <section className="reorder-group">
        <h3>{title}</h3>
        <ul
          className="section-order-list"
          onDragOver={(e) => {
            if (!dragId) return;
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/section-id") || dragId;
            if (id) onMoveColumn(id, column);
            setDragId(null);
          }}
        >
          {!ids.length && <li className="section-order-empty">Drop here</li>}
          {ids.map((id, i) => (
            <li
              key={id}
              className={`section-order-item ${dragId === id ? "is-dragging" : ""}`}
              draggable
              onDragStart={(e) => {
                setDragId(id);
                e.dataTransfer.setData("text/section-id", id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const dragged = e.dataTransfer.getData("text/section-id") || dragId;
                if (dragged && dragged !== id) onDropRelative(dragged, id, "before");
                setDragId(null);
              }}
            >
              <span className="section-order-grip" aria-hidden>
                ⠿
              </span>
              <div>
                <strong>{sectionLabel(id)}</strong>
                <em>
                  {i + 1} · hold & drag
                </em>
              </div>
              <span className="reorder-btns">
                <button type="button" onClick={() => onMoveColumn(id, "left")} disabled={column === "left"} aria-label="Move left">
                  ←
                </button>
                <button type="button" onClick={() => onMoveSection(id, "up")} disabled={i === 0} aria-label="Move up">
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onMoveSection(id, "down")}
                  disabled={i === ids.length - 1}
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button type="button" onClick={() => onMoveColumn(id, "right")} disabled={column === "right"} aria-label="Move right">
                  →
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <SidePanel title="Rearrange" onClose={onClose} wide>
      <p className="editor-panel-lead">Hold ⠿ and drag, or use ← ↑ ↓ → to place sections left/right.</p>
      <div className="section-order-columns">
        <ColumnList title="Left column" ids={left} column="left" />
        <ColumnList title="Right column" ids={right} column="right" />
      </div>

      <p className="editor-panel-lead" style={{ marginTop: "1.1rem" }}>
        Reorder items inside a section
      </p>
      <ReorderGroup
        title="Experience"
        items={cv.experience.map((j) => [j.title, j.company].filter(Boolean).join(" — ") || "Role")}
        onUp={(i) => i > 0 && onMoveEntry("experience", i, i - 1)}
        onDown={(i) => i < cv.experience.length - 1 && onMoveEntry("experience", i, i + 1)}
      />
      <ReorderGroup
        title="Education"
        items={cv.education.map((e) => [e.degree, e.school].filter(Boolean).join(" · ") || "Education")}
        onUp={(i) => i > 0 && onMoveEntry("education", i, i - 1)}
        onDown={(i) => i < cv.education.length - 1 && onMoveEntry("education", i, i + 1)}
      />
      <ReorderGroup
        title="Projects"
        items={cv.projects.map((p) => p.name || "Project")}
        onUp={(i) => i > 0 && onMoveEntry("projects", i, i - 1)}
        onDown={(i) => i < cv.projects.length - 1 && onMoveEntry("projects", i, i + 1)}
      />
    </SidePanel>
  );
}

function ReorderGroup({
  title,
  items,
  onUp,
  onDown,
}: {
  title: string;
  items: string[];
  onUp: (i: number) => void;
  onDown: (i: number) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="reorder-group">
      <h3>{title}</h3>
      <ul>
        {items.map((label, i) => (
          <li key={`${title}-${i}`}>
            <span>{label}</span>
            <span className="reorder-btns">
              <button type="button" onClick={() => onUp(i)} disabled={i === 0} aria-label="Move up">
                ↑
              </button>
              <button type="button" onClick={() => onDown(i)} disabled={i === items.length - 1} aria-label="Move down">
                ↓
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HistoryPanel({
  entries,
  onRestore,
  onClose,
}: {
  entries: { id: string; label: string; at: string }[];
  onRestore: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <SidePanel title="History" onClose={onClose}>
      <p className="editor-panel-lead">Snapshots from this session. Restore any earlier version of your edits.</p>
      {!entries.length && <p className="editor-panel-hint">Edit the CV to start building history.</p>}
      <ul className="history-list">
        {entries.map((e) => (
          <li key={e.id}>
            <div>
              <strong>{e.label}</strong>
              <span>{e.at}</span>
            </div>
            <button type="button" className="btn btn-ghost" style={{ padding: "0.3rem 0.6rem", fontSize: "0.78rem" }} onClick={() => onRestore(e.id)}>
              Restore
            </button>
          </li>
        ))}
      </ul>
    </SidePanel>
  );
}

function FormatAction({
  label,
  title,
  onClick,
  wide,
}: {
  label: ReactNode;
  title: string;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      className={`text-format-btn${wide ? " is-wide" : ""}`}
      title={title}
      onMouseDown={(e) => {
        // Keep CV selection alive while clicking format controls.
        e.preventDefault();
        startFormatSelectionTracking();
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

const HIGHLIGHT_SWATCHES = ["#fef08a", "#bbf7d0", "#bae6fd", "#fbcfe8", "#e9d5ff", "transparent"] as const;
const TEXT_SWATCHES = ["#0f172a", "#0f766e", "#1d4ed8", "#b91c1c", "#a16207", "#64748b"] as const;

export function FormatPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    startFormatSelectionTracking();
  }, []);

  return (
    <SidePanel title="Format" onClose={onClose}>
      <p className="editor-panel-lead">Select text on the CV, then apply formatting here.</p>

      <h3 className="tailor-section-title">Style</h3>
      <div className="text-format-grid">
        <FormatAction label={<strong>B</strong>} title="Bold" onClick={() => runExecCommand("bold")} />
        <FormatAction label={<em>I</em>} title="Italic" onClick={() => runExecCommand("italic")} />
        <FormatAction
          label={<span className="text-format-u">U</span>}
          title="Underline"
          onClick={() => runExecCommand("underline")}
        />
        <FormatAction
          label={<span className="text-format-s">S</span>}
          title="Strikethrough"
          onClick={() => runExecCommand("strikeThrough")}
        />
      </div>

      <h3 className="tailor-section-title">Lists & spacing</h3>
      <div className="text-format-grid">
        <FormatAction label="• List" title="Toggle bullets" onClick={() => toggleBulletSelection()} wide />
        <FormatAction label="1. List" title="Toggle numbered list" onClick={() => toggleNumberedSelection()} wide />
        <FormatAction label="Indent" title="Indent" onClick={() => indentSelection(false)} />
        <FormatAction label="Outdent" title="Outdent" onClick={() => indentSelection(true)} />
      </div>

      <h3 className="tailor-section-title">Align</h3>
      <div className="text-format-grid">
        <FormatAction label="Left" title="Align left" onClick={() => runExecCommand("justifyLeft")} />
        <FormatAction label="Center" title="Align center" onClick={() => runExecCommand("justifyCenter")} />
        <FormatAction label="Right" title="Align right" onClick={() => runExecCommand("justifyRight")} />
      </div>

      <h3 className="tailor-section-title">Case</h3>
      <div className="text-format-grid">
        <FormatAction label="AA" title="UPPERCASE" onClick={() => transformSelectedCase("upper")} />
        <FormatAction label="aa" title="lowercase" onClick={() => transformSelectedCase("lower")} />
        <FormatAction label="Tt" title="Title Case" onClick={() => transformSelectedCase("title")} />
        <FormatAction label="Aa." title="Sentence case" onClick={() => transformSelectedCase("sentence")} />
      </div>

      <h3 className="tailor-section-title">Text color</h3>
      <div className="text-format-swatches" role="group" aria-label="Text color">
        {TEXT_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            className="text-format-swatch"
            style={{ background: c }}
            title={c}
            aria-label={`Text color ${c}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runExecCommand("foreColor", c)}
          />
        ))}
      </div>

      <h3 className="tailor-section-title">Highlight</h3>
      <div className="text-format-swatches" role="group" aria-label="Highlight">
        {HIGHLIGHT_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            className={`text-format-swatch${c === "transparent" ? " is-clear" : ""}`}
            style={c === "transparent" ? undefined : { background: c }}
            title={c === "transparent" ? "Clear highlight" : c}
            aria-label={c === "transparent" ? "Clear highlight" : `Highlight ${c}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (c === "transparent") {
                runExecCommand("removeFormat");
                return;
              }
              // hiliteColor works in most browsers; backColor as fallback
              if (!runExecCommand("hiliteColor", c)) runExecCommand("backColor", c);
            }}
          />
        ))}
      </div>

      <h3 className="tailor-section-title">Size</h3>
      <div className="text-format-grid">
        <FormatAction label="A−" title="Smaller" onClick={() => runExecCommand("fontSize", "2")} />
        <FormatAction label="A" title="Normal" onClick={() => runExecCommand("fontSize", "3")} />
        <FormatAction label="A+" title="Larger" onClick={() => runExecCommand("fontSize", "5")} />
      </div>

      <button
        type="button"
        className="btn btn-ghost"
        style={{ width: "100%", marginTop: "0.85rem" }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => runExecCommand("removeFormat")}
      >
        Clear formatting
      </button>
      <p className="editor-panel-hint" style={{ marginTop: "0.75rem" }}>
        Tip: keep text selected, then click a format — the panel won’t steal your selection.
      </p>
    </SidePanel>
  );
}
