"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PdfOverlayLine } from "@/lib/api";
import { assignSectionsToLines, SECTION_LABELS, sectionBounds } from "@/lib/sectionDetect";

const RENDER_SCALE = 1.35;

type PageSize = { width: number; height: number };

function uid() {
  return `line-${Math.random().toString(36).slice(2, 10)}`;
}

function isDirty(line: PdfOverlayLine) {
  const original = line.originalText ?? line.text;
  return line.text.trim() !== original.trim();
}

function groupItemsToLines(
  items: { str: string; x: number; y: number; w: number; h: number; fontSize: number }[],
  page: number,
): PdfOverlayLine[] {
  const usable = items.filter((i) => i.str.trim().length);
  usable.sort((a, b) => a.y - b.y || a.x - b.x);

  const lines: PdfOverlayLine[] = [];
  for (const item of usable) {
    const last = lines[lines.length - 1];
    const sameLine =
      last &&
      last.page === page &&
      Math.abs(last.y + last.h / 2 - (item.y + item.h / 2)) < Math.max(2.5, item.h * 0.4);
    if (sameLine && last) {
      const gap = item.x - (last.x + last.w);
      last.text += (gap > Math.max(1.5, item.fontSize * 0.18) ? " " : "") + item.str;
      last.originalText = last.text;
      const right = Math.max(last.x + last.w, item.x + item.w);
      const left = Math.min(last.x, item.x);
      last.x = left;
      last.w = right - left;
      last.h = Math.max(last.h, item.h);
      last.y = Math.min(last.y, item.y);
      last.fontSize = Math.max(last.fontSize, item.fontSize);
    } else {
      lines.push({
        id: uid(),
        page,
        x: item.x,
        y: item.y,
        w: Math.max(item.w, 10),
        h: Math.max(item.h, 9),
        text: item.str,
        originalText: item.str,
        fontSize: item.fontSize,
      });
    }
  }
  return lines;
}

function HitOrDirtyLine({
  line,
  selected,
  sectionActive,
  onSelect,
  onAnchor,
}: {
  line: PdfOverlayLine;
  selected: boolean;
  sectionActive: boolean;
  onSelect: () => void;
  onAnchor: (el: HTMLElement | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dirty = isDirty(line);

  useEffect(() => {
    if (selected) onAnchor(ref.current);
  }, [selected, onAnchor]);

  return (
    <div
      ref={ref}
      data-line={line.id}
      data-section={line.section || ""}
      className={[
        "pdf-line",
        dirty ? "is-dirty" : "is-pristine",
        selected ? "is-selected" : "",
        sectionActive ? "in-active-section" : "",
        line.isHeader ? "is-header-line" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: line.x - 1,
        top: line.y - 1,
        width: Math.max(line.w + 2, 24),
        height: Math.max(line.h + 2, 12),
        fontSize: Math.max(9, line.fontSize * 0.95),
      }}
      title={
        line.isHeader
          ? `Section: ${SECTION_LABELS[line.section || ""] || line.section}`
          : dirty
            ? line.text
            : `Section: ${SECTION_LABELS[line.section || ""] || line.section || "—"} — click to select`
      }
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {dirty ? line.text : null}
    </div>
  );
}

type Props = {
  fileUrl: string;
  overlays: PdfOverlayLine[];
  selectedId: string | null;
  selectedSection: string | null;
  onSelectLine: (id: string | null) => void;
  onSelectSection: (section: string | null) => void;
  onOverlaysReady: (lines: PdfOverlayLine[]) => void;
  onAnchor: (el: HTMLElement | null) => void;
};

export default function PdfCvCanvas({
  fileUrl,
  overlays,
  selectedId,
  selectedSection,
  onSelectLine,
  onSelectSection,
  onOverlaysReady,
  onAnchor,
}: Props) {
  const [pageSizes, setPageSizes] = useState<PageSize[]>([]);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const seededRef = useRef(false);

  const sectionKeys = useMemo(() => {
    const keys: string[] = [];
    for (const line of overlays) {
      const s = line.section || "personal_information";
      if (!keys.includes(s)) keys.push(s);
    }
    return keys;
  }, [overlays]);

  useEffect(() => {
    let cancelled = false;
    seededRef.current = false;
    setNumPages(0);
    setPageSizes([]);

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error("Could not load the original PDF. Re-upload a PDF CV.");
        const data = new Uint8Array(await res.arrayBuffer());
        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;

        setNumPages(pdf.numPages);
        const sizes: PageSize[] = [];
        const extracted: PdfOverlayLine[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: RENDER_SCALE });
          sizes.push({ width: viewport.width, height: viewport.height });

          const content = await page.getTextContent();
          const raw: { str: string; x: number; y: number; w: number; h: number; fontSize: number }[] = [];

          for (const item of content.items) {
            if (!("str" in item) || !item.str) continue;
            const tx = pdfjs.Util.transform(viewport.transform, item.transform);
            const fontSize = Math.hypot(tx[2], tx[3]) || Math.hypot(tx[0], tx[1]) || 11;
            const x = tx[4];
            const y = tx[5] - fontSize;
            const w = typeof item.width === "number" ? item.width * RENDER_SCALE : item.str.length * fontSize * 0.5;
            raw.push({
              str: item.str,
              x,
              y,
              w,
              h: fontSize * 1.05,
              fontSize,
            });
          }
          extracted.push(...groupItemsToLines(raw, pageNum));
        }

        if (cancelled) return;
        setPageSizes(sizes);

        const withSections = assignSectionsToLines(extracted);

        if (!overlays.length && withSections.length && !seededRef.current) {
          seededRef.current = true;
          onOverlaysReady(withSections);
        } else if (overlays.length && overlays.every((o) => !o.section) && withSections.length) {
          // Upgrade old overlays missing section tags using fresh geometry + text match
          seededRef.current = true;
          onOverlaysReady(withSections);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to open PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  useEffect(() => {
    if (!numPages || !pageSizes.length) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const res = await fetch(fileUrl);
        const data = new Uint8Array(await res.arrayBuffer());
        const pdf = await pdfjs.getDocument({ data }).promise;
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: RENDER_SCALE });
          const canvas = canvasRefs.current[pageNum - 1];
          if (!canvas) continue;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) await page.render({ canvasContext: ctx, viewport }).promise;
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, numPages, pageSizes.length]);

  if (error) {
    return <div className="canva-banner error">{error}</div>;
  }

  return (
    <div
      className="pdf-stack"
      onMouseDown={() => {
        onSelectLine(null);
        onSelectSection(null);
      }}
    >
      {loading && <div className="pdf-loading">Opening your CV PDF…</div>}
      {Array.from({ length: numPages || 0 }).map((_, index) => {
        const page = index + 1;
        const size = pageSizes[index] || { width: 794 * RENDER_SCALE, height: 1123 * RENDER_SCALE };
        const pageLines = overlays.filter((l) => l.page === page);
        return (
          <div
            key={page}
            className="pdf-page"
            style={{ width: size.width, height: size.height }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <canvas
              ref={(el) => {
                canvasRefs.current[index] = el;
              }}
              className="pdf-canvas"
            />

            {/* Section frames */}
            <div className="pdf-section-layer">
              {sectionKeys.map((section) => {
                const box = sectionBounds(overlays, section, page);
                if (!box) return null;
                const active = selectedSection === section;
                return (
                  <button
                    key={`${page}-${section}`}
                    type="button"
                    className={`pdf-section-band ${active ? "is-active" : ""}`}
                    style={{
                      left: box.left,
                      top: box.top,
                      width: box.width,
                      height: box.height,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onSelectSection(section);
                      const first = overlays.find((l) => l.section === section && !l.isHeader) ||
                        overlays.find((l) => l.section === section);
                      onSelectLine(first?.id ?? null);
                    }}
                  >
                    <span className="pdf-section-tag">{SECTION_LABELS[section] || section}</span>
                  </button>
                );
              })}
            </div>

            <div className="pdf-overlay-layer">
              {pageLines.map((line) => (
                <HitOrDirtyLine
                  key={line.id}
                  line={line}
                  selected={selectedId === line.id}
                  sectionActive={!!selectedSection && line.section === selectedSection}
                  onSelect={() => {
                    onSelectSection(line.section || "personal_information");
                    onSelectLine(line.id);
                  }}
                  onAnchor={onAnchor}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
