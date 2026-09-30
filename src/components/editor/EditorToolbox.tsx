"use client";

import { scoreToGrade } from "@/lib/score-grade";
import type { EditorPanel } from "@/components/editor/EditorPanels";

export function EditorToolbox({
  active,
  onOpen,
  grade,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveLabel,
}: {
  active: EditorPanel;
  onOpen: (panel: EditorPanel) => void;
  grade: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  saveLabel: string;
}) {
  const toggle = (panel: NonNullable<EditorPanel>) => onOpen(active === panel ? null : panel);

  return (
    <div className="editor-toolbox">
      <div className="editor-toolbox-left">
        <button
          type="button"
          className={`toolbox-btn toolbox-btn--fix ${active === "fix" ? "is-active" : ""}`}
          onClick={() => toggle("fix")}
        >
          <span className="toolbox-ico" aria-hidden>
            ✓
          </span>
          Fix Resume
          {grade ? <em className="toolbox-grade">{grade}</em> : null}
        </button>
        <button
          type="button"
          className={`toolbox-btn ${active === "tailor" ? "is-active" : ""}`}
          onClick={() => toggle("tailor")}
        >
          <span className="toolbox-ico" aria-hidden>
            ATS
          </span>
          Check & Tailor
        </button>
        <span className="toolbox-sep" aria-hidden />
        <button
          type="button"
          className={`toolbox-icon-btn ${active === "rearrange" ? "is-active" : ""}`}
          title="Rearrange"
          aria-label="Rearrange"
          onClick={() => toggle("rearrange")}
        >
          ↕
        </button>
        <button
          type="button"
          className={`toolbox-icon-btn ${active === "templates" ? "is-active" : ""}`}
          title="Templates"
          aria-label="Templates"
          onClick={() => toggle("templates")}
        >
          ▦
        </button>
        <button
          type="button"
          className={`toolbox-icon-btn ${active === "design" ? "is-active" : ""}`}
          title="Design"
          aria-label="Design"
          onClick={() => toggle("design")}
        >
          ◑
        </button>
      </div>
      <div className="editor-toolbox-right">
        <span className="toolbox-save">{saveLabel}</span>
        <button type="button" className="toolbox-icon-btn" title="Undo" aria-label="Undo" disabled={!canUndo} onClick={onUndo}>
          ↶
        </button>
        <button type="button" className="toolbox-icon-btn" title="Redo" aria-label="Redo" disabled={!canRedo} onClick={onRedo}>
          ↷
        </button>
        <button
          type="button"
          className={`toolbox-btn ${active === "history" ? "is-active" : ""}`}
          onClick={() => toggle("history")}
        >
          <span className="toolbox-ico" aria-hidden>
            ◷
          </span>
          History
        </button>
      </div>
    </div>
  );
}

export function gradeFromOverall(overall: number | null | undefined): string | null {
  if (overall == null || Number.isNaN(overall)) return null;
  return scoreToGrade(overall);
}
