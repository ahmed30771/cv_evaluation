"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { runExecCommand, toggleBulletSelection, transformSelectedCase } from "@/lib/text-format";

export type SectionActionTarget =
  | { scope: "section"; sectionId: string; label: string }
  | { scope: "entry"; sectionId: string; index: number; label: string };

type Panel = "none" | "format" | "ai";

export function SectionShell({
  target,
  activeKey,
  onActivate,
  onDelete,
  onAiImprove,
  onDragSectionStart,
  onDropOnSection,
  onDropOnEntry,
  onInsertSection,
  aiBusy,
  aiError,
  children,
  className,
  style,
}: {
  target: SectionActionTarget;
  activeKey: string | null;
  onActivate: (key: string, target: SectionActionTarget) => void;
  onDelete: (target: SectionActionTarget) => void;
  onAiImprove: (target: SectionActionTarget, instruction: string) => Promise<void>;
  onDragSectionStart?: (sectionId: string) => void;
  onDropOnSection?: (draggedId: string, targetId: string, place: "before" | "after") => void;
  onDropOnEntry?: (
    sectionId: string,
    fromIndex: number,
    toIndex: number,
    place: "before" | "after",
  ) => void;
  /** Hover “+” — add a section type, or an entry below for multi-item sections. */
  onInsertSection?: () => void;
  aiBusy: boolean;
  aiError: string | null;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const key = targetKey(target);
  const active = activeKey === key;
  const [panel, setPanel] = useState<Panel>("none");
  const [dropEdge, setDropEdge] = useState<"before" | "after" | null>(null);
  const [toolbarBelow, setToolbarBelow] = useState(false);
  const [instruction, setInstruction] = useState(
    "Improve this for clarity, impact, and ATS keywords. Keep all facts true.",
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const isBodySection = target.scope === "section" && !["personal", "contact"].includes(target.sectionId);
  const isEntry = target.scope === "entry";
  const canDrag = isBodySection || isEntry;

  useEffect(() => {
    if (!active) setPanel("none");
  }, [active]);

  // A4 clip uses overflow:hidden — flip toolbar below when there isn't room above.
  useLayoutEffect(() => {
    if (!active) {
      setToolbarBelow(false);
      return;
    }
    const shell = rootRef.current;
    if (!shell) return;

    const place = () => {
      const clip = shell.closest(".cv-a4-clip") as HTMLElement | null;
      if (!clip) {
        setToolbarBelow(false);
        return;
      }
      const shellRect = shell.getBoundingClientRect();
      const clipRect = clip.getBoundingClientRect();
      const need = 48;
      const spaceAbove = shellRect.top - clipRect.top;
      const spaceBelow = clipRect.bottom - shellRect.bottom;
      setToolbarBelow(spaceAbove < need && spaceBelow >= need);
    };

    place();
    const ro = new ResizeObserver(place);
    ro.observe(shell);
    window.addEventListener("scroll", place, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", place, true);
    };
  }, [active, key]);

  function runFormat(cmd: string) {
    runExecCommand(cmd);
  }

  function transformSelection(mode: "upper" | "lower" | "title" | "bullet") {
    if (mode === "bullet") {
      toggleBulletSelection();
      return;
    }
    transformSelectedCase(mode);
  }

  function onDragStart(e: DragEvent) {
    if (!canDrag) return;
    e.stopPropagation();
    if (isEntry && target.scope === "entry") {
      e.dataTransfer.setData("text/entry-ref", `${target.sectionId}:${target.index}`);
      e.dataTransfer.setData("text/plain", `entry:${target.sectionId}:${target.index}`);
    } else {
      e.dataTransfer.setData("text/section-id", target.sectionId);
      e.dataTransfer.setData("text/plain", `section:${target.sectionId}`);
      onDragSectionStart?.(target.sectionId);
    }
    e.dataTransfer.effectAllowed = "move";
    rootRef.current?.classList.add("is-dragging");
  }

  function onDragEnd() {
    rootRef.current?.classList.remove("is-dragging");
    setDropEdge(null);
  }

  function onDragOver(e: DragEvent) {
    const types = e.dataTransfer.types;
    const sectionDrag = types.includes("text/section-id") && isBodySection && onDropOnSection;
    const entryDrag = types.includes("text/entry-ref") && isEntry && onDropOnEntry;
    if (!sectionDrag && !entryDrag) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mid = rect.top + rect.height / 2;
    setDropEdge(e.clientY < mid ? "before" : "after");
  }

  function onDragLeave(e: DragEvent) {
    if (!rootRef.current?.contains(e.relatedTarget as Node)) setDropEdge(null);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const place = dropEdge || "before";
    setDropEdge(null);

    if (isEntry && target.scope === "entry" && onDropOnEntry) {
      const ref = e.dataTransfer.getData("text/entry-ref");
      if (!ref) return;
      const [sec, idxStr] = ref.split(":");
      const fromIndex = Number(idxStr);
      if (sec !== target.sectionId || Number.isNaN(fromIndex)) return;
      if (fromIndex === target.index) return;
      onDropOnEntry(sec, fromIndex, target.index, place);
      return;
    }

    if (isBodySection && onDropOnSection) {
      const draggedId = e.dataTransfer.getData("text/section-id");
      if (draggedId && draggedId !== target.sectionId) {
        onDropOnSection(draggedId, target.sectionId, place);
      }
    }
  }

  return (
    <div
      ref={rootRef}
      className={`cv-section-shell ${active ? "is-active" : ""} ${dropEdge ? `drop-${dropEdge}` : ""} ${className || ""}`}
      style={style}
      data-section-id={isBodySection ? target.sectionId : undefined}
      data-entry-ref={isEntry && target.scope === "entry" ? `${target.sectionId}:${target.index}` : undefined}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest(".cv-section-toolbar")) return;
        if ((e.target as HTMLElement).closest(".cv-section-grip")) return;
        if ((e.target as HTMLElement).closest(".cv-format-popover")) return;
        if ((e.target as HTMLElement).closest(".cv-ai-panel")) return;
        if ((e.target as HTMLElement).closest(".cv-section-insert")) return;
        e.stopPropagation();
        onActivate(key, target);
      }}
      onFocusCapture={() => onActivate(key, target)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {canDrag && (
        <button
          type="button"
          className="cv-section-grip"
          title="Hold and drag to move"
          aria-label="Drag to move"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onMouseDown={(e) => {
            e.stopPropagation();
            onActivate(key, target);
          }}
        >
          ⠿
        </button>
      )}
      {active && (
        <div
          className={`cv-section-toolbar${toolbarBelow ? " is-below" : ""}`}
          role="toolbar"
          aria-label={`${target.label} tools`}
        >
          <button
            type="button"
            className={`cv-tool-btn ${panel === "format" ? "is-on" : ""}`}
            title="Text decoration"
            aria-expanded={panel === "format"}
            onClick={() => setPanel((p) => (p === "format" ? "none" : "format"))}
          >
            <span aria-hidden>Aa</span>
            Format
          </button>
          {panel === "format" && (
            <div className="cv-format-inline" role="group" aria-label="Text formatting">
              <button type="button" className="cv-format-btn" onClick={() => runFormat("bold")} title="Bold">
                <strong>B</strong>
              </button>
              <button type="button" className="cv-format-btn" onClick={() => runFormat("italic")} title="Italic">
                <em>I</em>
              </button>
              <button type="button" className="cv-format-btn" onClick={() => runFormat("underline")} title="Underline">
                <span className="cv-format-u">U</span>
              </button>
              <span className="cv-format-divider" aria-hidden />
              <button
                type="button"
                className="cv-format-btn"
                onClick={() => transformSelection("bullet")}
                title="Toggle bullet list"
              >
                •••
              </button>
              <span className="cv-format-divider" aria-hidden />
              <button
                type="button"
                className="cv-format-btn"
                onClick={() => transformSelection("upper")}
                title="UPPERCASE"
              >
                AA
              </button>
              <button
                type="button"
                className="cv-format-btn"
                onClick={() => transformSelection("lower")}
                title="lowercase"
              >
                aa
              </button>
              <button
                type="button"
                className="cv-format-btn"
                onClick={() => transformSelection("title")}
                title="Title Case"
              >
                Tt
              </button>
            </div>
          )}
          <button
            type="button"
            className={`cv-tool-btn ${panel === "ai" ? "is-on" : ""}`}
            title="Improve with AI"
            onClick={() => setPanel((p) => (p === "ai" ? "none" : "ai"))}
          >
            <span aria-hidden>✦</span>
            AI
          </button>
          <button
            type="button"
            className="cv-tool-btn cv-tool-btn--danger"
            title="Delete"
            aria-label="Delete"
            onClick={() => onDelete(target)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 7h16"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
              />
              <path
                d="M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1z"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinejoin="round"
              />
              <path
                d="M6.5 7l.8 12.2A2 2 0 0 0 9.3 21h5.4a2 2 0 0 0 2-1.8L17.5 7"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinejoin="round"
              />
              <path
                d="M10 11v6M14 11v6"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}

      {active && panel === "ai" && (
        <div className="cv-ai-panel">
          <label htmlFor={`ai-ins-${key}`}>Instructions</label>
          <textarea
            id={`ai-ins-${key}`}
            rows={3}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. Make bullets more quantified and senior…"
          />
          <div className="cv-ai-panel-actions">
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.82rem" }}
              disabled={aiBusy || !instruction.trim()}
              onClick={() => void onAiImprove(target, instruction.trim())}
            >
              {aiBusy ? "Improving…" : "Improve with AI"}
            </button>
            {aiError && <span className="cv-ai-panel-err">{aiError}</span>}
          </div>
        </div>
      )}

      <div className="cv-section-shell-body">{children}</div>

      {onInsertSection && (isBodySection || isEntry) ? (
        <div className="cv-section-insert">
          <button
            type="button"
            className="cv-section-insert-btn"
            title={isEntry ? "Add entry below" : "Add section"}
            aria-label={isEntry ? "Add entry below" : "Add section below"}
            onClick={(e) => {
              e.stopPropagation();
              onInsertSection();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            +
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function targetKey(target: SectionActionTarget): string {
  return target.scope === "section"
    ? `section:${target.sectionId}`
    : `entry:${target.sectionId}:${target.index}`;
}
