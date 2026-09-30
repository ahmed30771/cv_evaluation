"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TemplateId } from "@/lib/cv-types";
import { exportCvUrl } from "@/lib/api";

const STORAGE_KEY = "bx.editor.leftRailExpanded";

export function EditorLeftRail({
  id,
  templateId,
  onAiRewrite,
  aiBusy,
}: {
  id: string;
  templateId: TemplateId;
  onAiRewrite: () => void;
  aiBusy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      setExpanded(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <nav
      className={`editor-left-rail ${expanded ? "is-expanded" : ""}`}
      aria-label="Resume actions"
    >
      <button
        type="button"
        className="rail-toggle"
        title={expanded ? "Collapse menu" : "Expand menu"}
        aria-label={expanded ? "Collapse menu" : "Expand menu"}
        aria-expanded={expanded}
        onClick={toggle}
      >
        <span aria-hidden>{expanded ? "‹" : "›"}</span>
        {expanded && <span className="rail-label">Collapse</span>}
      </button>

      <Link href={`/evaluations/${id}`} className="rail-btn" title="Score report">
        <span className="rail-ico" aria-hidden>
          ◉
        </span>
        <span className="rail-label">Score report</span>
      </Link>
      <a
        className="rail-btn"
        href={exportCvUrl(id, "pdf", templateId)}
        title="Download PDF"
      >
        <span className="rail-ico" aria-hidden>
          ↓
        </span>
        <span className="rail-label">Download PDF</span>
      </a>
      <a
        className="rail-btn"
        href={exportCvUrl(id, "docx", templateId)}
        title="Download DOCX"
      >
        <span className="rail-ico" aria-hidden>
          📑
        </span>
        <span className="rail-label">Download DOCX</span>
      </a>
      <button
        type="button"
        className="rail-btn"
        title="Full AI rewrite"
        disabled={aiBusy}
        onClick={onAiRewrite}
      >
        <span className="rail-ico" aria-hidden>
          ✦
        </span>
        <span className="rail-label">{aiBusy ? "Rewriting…" : "AI rewrite"}</span>
      </button>
    </nav>
  );
}
