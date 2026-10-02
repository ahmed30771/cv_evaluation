"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { A4_HEIGHT_PX, A4_WIDTH_PX } from "@/lib/a4";

export type PageMeta = {
  pageCount: number;
};

export type PageContentRef =
  | { kind: "entry"; sectionId: string; index: number }
  | { kind: "section"; sectionId: string };

function offsetTopWithin(root: HTMLElement, node: HTMLElement) {
  const rootRect = root.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  return nodeRect.top - rootRect.top;
}

function computeBreakPads(root: HTMLElement): Record<string, number> {
  const pads: Record<string, number> = {};

  for (let iter = 0; iter < 8; iter++) {
    const rules = Object.entries(pads)
      .map(([key, px]) => {
        const sel = key.includes(":")
          ? `.cv-a4-page-inner [data-entry-ref="${CSS.escape(key)}"]`
          : `.cv-a4-page-inner [data-section-id="${CSS.escape(key)}"]`;
        return `${sel}{margin-top:${px}px !important;}`;
      })
      .join("\n");

    const styleEl = root.ownerDocument.querySelector<HTMLStyleElement>("[data-cv-a4-breaks]");
    if (styleEl) styleEl.textContent = rules;

    let changed = false;
    const nodes = [
      ...root.querySelectorAll<HTMLElement>("[data-entry-ref]"),
      ...root.querySelectorAll<HTMLElement>("[data-section-id]"),
    ];

    for (const node of nodes) {
      const entryRef = node.getAttribute("data-entry-ref");
      const sectionId = node.getAttribute("data-section-id");
      if (sectionId && node.querySelector("[data-entry-ref]")) continue;
      const key = entryRef || sectionId;
      if (!key) continue;

      const top = offsetTopWithin(root, node);
      const height = node.offsetHeight;
      if (height < 8) continue;
      const bottom = top + height;
      const boundary = Math.ceil((top + 0.001) / A4_HEIGHT_PX) * A4_HEIGHT_PX;
      if (top < boundary && bottom > boundary + 1) {
        const extra = Math.ceil(boundary - top);
        if (extra > 0 && extra < A4_HEIGHT_PX - 24) {
          pads[key] = (pads[key] || 0) + extra;
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  return pads;
}

function padsToCss(pads: Record<string, number>): string {
  return Object.entries(pads)
    .map(([key, px]) => {
      const sel = key.includes(":")
        ? `.cv-a4-page-inner [data-entry-ref="${CSS.escape(key)}"]`
        : `.cv-a4-page-inner [data-section-id="${CSS.escape(key)}"]`;
      return `${sel}{margin-top:${px}px !important;}`;
    })
    .join("\n");
}

function collectPageContent(root: HTMLElement, pageIndex: number): PageContentRef[] {
  const pageTop = pageIndex * A4_HEIGHT_PX;
  const pageBottom = pageTop + A4_HEIGHT_PX;
  const out: PageContentRef[] = [];
  const seen = new Set<string>();

  const nodes = [
    ...root.querySelectorAll<HTMLElement>("[data-entry-ref]"),
    ...root.querySelectorAll<HTMLElement>("[data-section-id]"),
  ];

  for (const node of nodes) {
    const entryRef = node.getAttribute("data-entry-ref");
    const sectionId = node.getAttribute("data-section-id");
    if (sectionId && node.querySelector("[data-entry-ref]")) continue;
    if (sectionId === "personal" || sectionId === "contact") continue;

    const top = offsetTopWithin(root, node);
    if (top < pageTop - 1 || top >= pageBottom - 4) continue;

    if (entryRef) {
      if (seen.has(`e:${entryRef}`)) continue;
      seen.add(`e:${entryRef}`);
      const [sec, idxStr] = entryRef.split(":");
      const index = Number(idxStr);
      if (!sec || Number.isNaN(index)) continue;
      out.push({ kind: "entry", sectionId: sec, index });
    } else if (sectionId) {
      if (seen.has(`s:${sectionId}`)) continue;
      seen.add(`s:${sectionId}`);
      out.push({ kind: "section", sectionId });
    }
  }

  return out;
}

/**
 * Each A4 sheet is a fixed viewport onto the CV document (absolute `top` offset).
 * Entries that would split across a page boundary get margin pushed so they start
 * on the next page.
 */
export type RailPaint = {
  width: string;
  background: string;
};

export function CvA4Pages({
  children,
  contentStyle,
  onPageMetaChange,
  onDuplicatePage,
  onPrepareNewPage,
  onDeletePageContent,
  pageShellStyle,
  railPaint,
  zoom = 1,
}: {
  children: ReactNode;
  contentStyle: CSSProperties;
  onPageMetaChange?: (meta: PageMeta) => void;
  onDuplicatePage?: () => void;
  onPrepareNewPage?: () => void;
  /** Remove CV blocks that live on a deleted page so middle pages can be removed. */
  onDeletePageContent?: (refs: PageContentRef[]) => void;
  /** Painted on every A4 sheet (e.g. sidebar rail stripe). */
  pageShellStyle?: CSSProperties;
  /** Absolute full-height rail stripe behind the clipped document. */
  railPaint?: RailPaint;
  zoom?: number;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const breakStyleRef = useRef<HTMLStyleElement | null>(null);
  const [contentH, setContentH] = useState(A4_HEIGHT_PX);
  const [minPages, setMinPages] = useState(1);
  const [breakCss, setBreakCss] = useState("");
  const onMetaRef = useRef(onPageMetaChange);
  onMetaRef.current = onPageMetaChange;

  const naturalPages = Math.max(1, Math.ceil(contentH / A4_HEIGHT_PX - 0.001));
  const pageCount = Math.max(minPages, naturalPages);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const run = () => {
      const pads = computeBreakPads(el);
      const css = padsToCss(pads);
      if (breakStyleRef.current) breakStyleRef.current.textContent = css;
      setBreakCss((prev) => (prev === css ? prev : css));

      const nextH = Math.max(1, Math.ceil(Math.max(el.scrollHeight, el.offsetHeight)));
      setContentH((prev) => (prev === nextH ? prev : nextH));
    };

    run();
    const ro = new ResizeObserver(() => run());
    ro.observe(el);
    const t = window.setTimeout(run, 220);
    return () => {
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, [children, pageCount]);

  useEffect(() => {
    if (minPages < naturalPages) setMinPages(naturalPages);
  }, [naturalPages, minPages]);

  useEffect(() => {
    onMetaRef.current?.({ pageCount });
  }, [pageCount]);

  function scrollToPage(index: number) {
    requestAnimationFrame(() => {
      document
        .getElementById(`cv-page-${index}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function addPage() {
    onPrepareNewPage?.();
    const nextIndex = pageCount;
    setMinPages((n) => Math.max(n, naturalPages) + 1);
    window.setTimeout(() => scrollToPage(nextIndex), 80);
  }

  function duplicatePage() {
    onDuplicatePage?.();
    setMinPages((n) => Math.max(n, naturalPages) + 1);
    window.setTimeout(() => scrollToPage(pageCount), 80);
  }

  function deletePage(index: number) {
    if (pageCount <= 1) return;
    if (index <= 0) return;

    const root = measureRef.current;
    const refs = root ? collectPageContent(root, index) : [];
    if (refs.length) onDeletePageContent?.(refs);

    setMinPages((n) => Math.max(1, Math.max(n, naturalPages) - 1));
    const nextFocus = Math.min(index, pageCount - 2);
    window.setTimeout(() => scrollToPage(Math.max(0, nextFocus)), 100);
  }

  const z = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;

  const baseDocStyle: CSSProperties = {
    ...contentStyle,
    overflow: "visible",
    transform: "none",
    margin: 0,
  };

  const doc = (pageIndex: number | null) => {
    const isMeasure = pageIndex === null;
    return (
      <div
        ref={isMeasure ? measureRef : undefined}
        className={
          isMeasure ? "cv-a4-page-inner cv-a4-page-inner--measure" : "cv-a4-page-inner"
        }
        style={
          isMeasure
            ? baseDocStyle
            : {
                ...baseDocStyle,
                position: "absolute",
                left: 0,
                right: 0,
                top: -((pageIndex as number) * A4_HEIGHT_PX),
                width: A4_WIDTH_PX,
                // Stretch document to full page stack so sidebar rail can fill each sheet.
                minHeight: pageCount * A4_HEIGHT_PX,
              }
        }
      >
        {children}
      </div>
    );
  };

  return (
    <div className="cv-a4-workspace" style={{ width: A4_WIDTH_PX * z }}>
      <style ref={breakStyleRef} data-cv-a4-breaks>
        {breakCss}
      </style>
      <div
        className="cv-a4-stack"
        style={{
          width: A4_WIDTH_PX,
          transform: z === 1 ? undefined : `scale(${z})`,
          transformOrigin: "top left",
        }}
      >
        <div className="cv-a4-stack-inner">
          <div className="cv-a4-measure-host" aria-hidden>
            {doc(null)}
          </div>

          {Array.from({ length: pageCount }, (_, i) => {
            const canDelete = pageCount > 1;

            return (
              <div key={i} id={`cv-page-${i}`} className="cv-a4-page-wrap">
                <article
                  className="cv-a4-page direct-edit-cv"
                  data-page={i + 1}
                  style={{
                    width: A4_WIDTH_PX,
                    height: A4_HEIGHT_PX,
                    maxHeight: A4_HEIGHT_PX,
                    overflow: "hidden",
                    position: "relative",
                    background: "#fff",
                    ...pageShellStyle,
                  }}
                >
                  {railPaint ? (
                    <div
                      className="cv-a4-rail-paint"
                      aria-hidden
                      style={{
                        width: railPaint.width,
                        background: railPaint.background,
                      }}
                    />
                  ) : null}
                  <div className="cv-a4-clip">{doc(i)}</div>
                </article>

                <div className="cv-a4-gap-cover" aria-hidden />

                <div className="cv-a4-page-footer" role="toolbar" aria-label={`Page ${i + 1} tools`}>
                  {i > 0 && (
                    <>
                      <button
                        type="button"
                        className="cv-a4-page-icon"
                        onClick={() => scrollToPage(i - 1)}
                        title="Previous page"
                        aria-label="Previous page"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M6 14.5 12 8.5l6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="cv-a4-page-icon"
                        onClick={() => scrollToPage(i + 1)}
                        disabled={i >= pageCount - 1}
                        title="Next page"
                        aria-label="Next page"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M6 9.5 12 15.5l6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="cv-a4-page-icon"
                    onClick={() => duplicatePage()}
                    title="Duplicate page"
                    aria-label="Duplicate page"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <rect x="8" y="8" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M6 16V5.5A1.5 1.5 0 0 1 7.5 4H16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <path d="M13.5 12.5v5M11 15h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </button>
                  {i > 0 && (
                    <button
                      type="button"
                      className="cv-a4-page-icon cv-a4-page-icon--danger"
                      onClick={() => deletePage(i)}
                      disabled={!canDelete}
                      title={canDelete ? "Delete this page" : "Cannot delete the only page"}
                      aria-label="Delete page"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M4 7h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                        <path d="M9.5 4h5a1 1 0 0 1 1 1v2h-7V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                        <path d="M6.5 7l.9 12.1A2 2 0 0 0 9.4 21h5.2a2 2 0 0 0 2-1.9L17.5 7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    className="cv-a4-page-icon"
                    onClick={addPage}
                    title="Add page"
                    aria-label="Add page"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <rect x="5" y="3.5" width="11" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M16.5 14.5v5M14 17h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
