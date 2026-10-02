"use client";

import type { EditorPanel } from "@/components/editor/EditorPanels";

type RailItem = {
  kind: "panel";
  id: NonNullable<EditorPanel>;
  label: string;
  icon: string;
  badge?: string | null;
};

export function EditorLeftRail({
  active,
  onOpen,
  fixGrade,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  active: EditorPanel;
  onOpen: (panel: EditorPanel) => void;
  fixGrade?: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const toggle = (panel: NonNullable<EditorPanel>) => onOpen(active === panel ? null : panel);

  const items: RailItem[] = [
    { kind: "panel", id: "templates", label: "Templates", icon: "▦" },
    { kind: "panel", id: "design", label: "Design", icon: "◐" },
    { kind: "panel", id: "format", label: "Format", icon: "Aa" },
    { kind: "panel", id: "tailor", label: "Rewrite", icon: "✦" },
    { kind: "panel", id: "fix", label: "Fix", icon: "✓", badge: fixGrade },
    { kind: "panel", id: "history", label: "History", icon: "◷" },
  ];

  return (
    <nav className="editor-left-rail" aria-label="Resume tools">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`rail-item ${active === item.id ? "is-active" : ""}`}
          aria-pressed={active === item.id}
          onClick={() => toggle(item.id)}
        >
          <span className="rail-item-ico" aria-hidden>
            {item.icon}
            {item.badge ? <em className="rail-item-badge">{item.badge}</em> : null}
          </span>
          <span className="rail-item-label">{item.label}</span>
        </button>
      ))}
      <button
        type="button"
        className="rail-item rail-item-undo-redo"
        title="Undo"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <span className="rail-item-ico" aria-hidden>
          ↶
        </span>
        <span className="rail-item-label">Undo</span>
      </button>
      <button
        type="button"
        className="rail-item rail-item-undo-redo"
        title="Redo"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={onRedo}
      >
        <span className="rail-item-ico" aria-hidden>
          ↷
        </span>
        <span className="rail-item-label">Redo</span>
      </button>
    </nav>
  );
}
