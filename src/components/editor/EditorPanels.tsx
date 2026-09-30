"use client";

import { useState, type ReactNode } from "react";
import { TemplateThumb } from "@/components/cv-templates/CvTemplatePreview";
import type { Finding, Report, StructuredCv, TemplateId } from "@/lib/api";
import type { BodySectionId } from "@/lib/cv-types";
import { TEMPLATES } from "@/lib/templates";
import { scoreToGrade } from "@/lib/score-grade";
import { presentByColumn, sectionLabel } from "@/lib/section-order";

export type EditorPanel =
  | "fix"
  | "tailor"
  | "templates"
  | "design"
  | "rearrange"
  | "history"
  | null;

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
  return (
    <aside className={`editor-side-panel ${wide ? "is-wide" : ""}`} role="dialog" aria-label={title}>
      <header className="editor-side-panel-head">
        <h2>{title}</h2>
        <button type="button" className="editor-panel-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>
      <div className="editor-side-panel-body">{children}</div>
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
  onClose: () => void;
}) {
  return (
    <SidePanel title="Check & Tailor" onClose={onClose} wide>
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
      <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: "0.65rem" }} disabled={busy || jobText.trim().length < 40} onClick={onRun}>
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
                <button type="button" className="btn btn-ghost" style={{ padding: "0.25rem 0.55rem", fontSize: "0.78rem" }} onClick={() => onApplySummary(suggestions.summary!)}>
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
                <button type="button" className="btn btn-ghost" style={{ padding: "0.25rem 0.55rem", fontSize: "0.78rem" }} onClick={() => onApplySkills(suggestions.skills!)}>
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
    </SidePanel>
  );
}

export function TemplatesPanel({
  cv,
  templateId,
  onPick,
  onClose,
}: {
  cv: StructuredCv;
  templateId: TemplateId;
  onPick: (id: TemplateId) => void;
  onClose: () => void;
}) {
  return (
    <SidePanel title="Templates" onClose={onClose} wide>
      <p className="editor-panel-lead">Pick a layout. Your content stays; only the design changes.</p>
      <div className="template-mini-grid">
        {TEMPLATES.map((t) => (
          <TemplateThumb
            key={t.id}
            cv={cv}
            templateId={t.id}
            label={t.label}
            badge={t.badge}
            active={templateId === t.id}
            onClick={() => onPick(t.id)}
          />
        ))}
      </div>
    </SidePanel>
  );
}

export function DesignPanel({
  preference,
  onPreference,
  onClose,
}: {
  preference: "ats" | "visual";
  onPreference: (p: "ats" | "visual") => void;
  onClose: () => void;
}) {
  return (
    <SidePanel title="Design" onClose={onClose}>
      <p className="editor-panel-lead">Choose a design direction. Templates marked ATS stay simpler for parsers.</p>
      <div className="design-choice-row">
        <button type="button" className={`design-choice ${preference === "ats" ? "is-active" : ""}`} onClick={() => onPreference("ats")}>
          <strong>ATS-first</strong>
          <span>Clean single-column friendly layouts</span>
        </button>
        <button type="button" className={`design-choice ${preference === "visual" ? "is-active" : ""}`} onClick={() => onPreference("visual")}>
          <strong>Visual</strong>
          <span>Bolder colors and multi-column designs</span>
        </button>
      </div>
      <p className="editor-panel-hint">Open Templates to apply a matching layout.</p>
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
