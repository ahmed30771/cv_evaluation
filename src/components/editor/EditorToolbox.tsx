"use client";

import { scoreToGrade } from "@/lib/score-grade";

export function EditorToolbox({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveLabel,
  zoom,
  onZoom,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  saveLabel: string;
  zoom: number;
  onZoom: (next: number) => void;
}) {
  return (
    <div className="editor-topbar-tools">
      {saveLabel ? <span className="toolbox-save">{saveLabel}</span> : null}
      <div className="toolbox-zoom" role="group" aria-label="Zoom">
        <button
          type="button"
          className="toolbox-icon-btn"
          title="Zoom out"
          aria-label="Zoom out"
          disabled={zoom <= 0.35}
          onClick={() => onZoom(Math.max(0.35, Math.round((zoom - 0.1) * 10) / 10))}
        >
          −
        </button>
        <span className="toolbox-zoom-label">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="toolbox-icon-btn"
          title="Zoom in"
          aria-label="Zoom in"
          disabled={zoom >= 1.5}
          onClick={() => onZoom(Math.min(1.5, Math.round((zoom + 0.1) * 10) / 10))}
        >
          +
        </button>
      </div>
      <button
        type="button"
        className="toolbox-icon-btn toolbox-undo-redo"
        title="Undo"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={onUndo}
      >
        ↶
      </button>
      <button
        type="button"
        className="toolbox-icon-btn toolbox-undo-redo"
        title="Redo"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={onRedo}
      >
        ↷
      </button>
    </div>
  );
}

export function gradeFromOverall(overall: number | null | undefined): string | null {
  if (overall == null || Number.isNaN(overall)) return null;
  return scoreToGrade(overall);
}
