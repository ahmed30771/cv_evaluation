"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplateId } from "@/lib/cv-types";
import { exportCvUrl } from "@/lib/api";

export function DownloadMenu({
  id,
  templateId,
  onBeforeDownload,
}: {
  id: string;
  templateId: TemplateId;
  /** Flush pending editor saves so export matches the canvas. */
  onBeforeDownload?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function download(format: "pdf" | "docx") {
    setBusy(true);
    try {
      await onBeforeDownload?.();
      const url = exportCvUrl(id, format, templateId);
      // Navigate after flush so DB has latest content + template.
      window.location.assign(url);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div className={`download-menu ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="btn btn-primary btn-compact"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        {busy ? "Preparing…" : "Download"}
        <span className="download-menu-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="download-menu-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            className="download-menu-item"
            disabled={busy}
            onClick={() => void download("pdf")}
          >
            PDF
          </button>
          <button
            type="button"
            role="menuitem"
            className="download-menu-item"
            disabled={busy}
            onClick={() => void download("docx")}
          >
            DOCX
          </button>
        </div>
      )}
    </div>
  );
}
