"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  evaluationFileUrl,
  getDraft,
  getReport,
  improveDraftText,
  reevaluateDraft,
  saveDraft,
  type DraftSections,
  type Finding,
  type PdfOverlayLine,
  type Report,
} from "@/lib/api";
import { studioPath } from "@/lib/site";

const PdfCvCanvas = dynamic(() => import("@/components/PdfCvCanvas"), { ssr: false });

type SectionKey = keyof DraftSections;

const BODY_SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "summary", label: "Professional Summary" },
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "projects", label: "Projects" },
  { key: "certifications", label: "Certifications" },
];

const EMPTY: DraftSections = {
  personal_information: "",
  summary: "",
  skills: "",
  experience: "",
  education: "",
  projects: "",
  certifications: "",
};

function splitPersonal(raw: string): { name: string; contact: string } {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);
  if (!nonEmpty.length) return { name: "", contact: "" };
  return { name: nonEmpty[0], contact: nonEmpty.slice(1).join("\n") };
}

function joinPersonal(name: string, contact: string): string {
  return [name.trim(), contact.trim()].filter(Boolean).join("\n");
}

function overlaysToText(overlays: PdfOverlayLine[]): string {
  return [...overlays]
    .sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x)
    .map((l) => l.text.trim())
    .filter(Boolean)
    .join("\n");
}

type EditableBlockProps = {
  blockId: string;
  value: string;
  placeholder: string;
  className?: string;
  multiline?: boolean;
  selected: boolean;
  onSelect: () => void;
  onChange: (value: string) => void;
  onToolbarAnchor: (el: HTMLElement | null) => void;
};

function EditableBlock({
  blockId,
  value,
  placeholder,
  className,
  multiline = true,
  selected,
  onSelect,
  onChange,
  onToolbarAnchor,
}: EditableBlockProps) {
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (selected) onToolbarAnchor(node);
      if (node && node.innerText !== value && document.activeElement !== node) {
        node.innerText = value;
      }
    },
    [selected, onToolbarAnchor, value],
  );

  return (
    <div
      ref={ref}
      data-block={blockId}
      className={`cv-block ${className || ""} ${selected ? "is-selected" : ""} ${!value ? "is-empty" : ""}`}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={multiline}
      data-placeholder={placeholder}
      onMouseDown={() => onSelect()}
      onFocus={() => onSelect()}
      onInput={(e) => {
        const next = e.currentTarget.innerText ?? "";
        onChange(multiline ? next.replace(/\n$/, "") : next.replace(/\n/g, " ").trim());
      }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (!multiline && e.key === "Enter") e.preventDefault();
      }}
    />
  );
}

function FloatingToolbar({
  anchor,
  busy,
  onImprove,
}: {
  anchor: HTMLElement | null;
  busy: boolean;
  onImprove: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!anchor) {
      setPos(null);
      return;
    }
    const workspace = anchor.closest(".canva-workspace") as HTMLElement | null;
    const update = () => {
      if (!anchor || !workspace) return;
      const a = anchor.getBoundingClientRect();
      const w = workspace.getBoundingClientRect();
      setPos({
        top: a.top - w.top + workspace.scrollTop - 48,
        left: a.left - w.left + workspace.scrollLeft + a.width / 2,
      });
    };
    update();
    workspace?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      workspace?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [anchor]);

  if (!pos) return null;

  return (
    <div
      className="canva-float-toolbar"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button type="button" disabled={busy} onClick={onImprove}>
        {busy ? "Writing…" : "Magic write"}
      </button>
    </div>
  );
}

export default function CvEditorPage() {
  const params = useParams();
  const id = String(params.id || "");

  const [sections, setSections] = useState<DraftSections>(EMPTY);
  const [overlays, setOverlays] = useState<PdfOverlayLine[]>([]);
  const [filename, setFilename] = useState("");
  const [fileType, setFileType] = useState("pdf");
  const [hasFile, setHasFile] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [activeBlock, setActiveBlock] = useState<string>("name");
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [suggestion, setSuggestion] = useState<{ target: string; mode: "line" | "section"; text: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [busy, setBusy] = useState<"improve" | "reeval" | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [panelOpen, setPanelOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [, startTransition] = useTransition();

  const pdfMode = hasFile && fileType === "pdf";
  const personal = useMemo(() => splitPersonal(sections.personal_information), [sections.personal_information]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [draft, rep] = await Promise.all([getDraft(id), getReport(id).catch(() => null)]);
        if (cancelled) return;
        setSections(draft.sections);
        setOverlays(draft.overlays || []);
        setFilename(draft.original_filename);
        setFileType(draft.file_type || "pdf");
        setHasFile(!!draft.has_file);
        setReport(rep);
        setLoaded(true);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load editor");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const actionableFindings = useMemo(() => {
    const findings = report?.findings ?? [];
    return findings.filter((f) => ["issue", "missing", "recommendation", "improvement"].includes(f.type));
  }, [report]);

  const setPersonalParts = useCallback((name: string, contact: string) => {
    setSections((prev) => ({
      ...prev,
      personal_information: joinPersonal(name, contact),
    }));
    setSaveState("idle");
  }, []);

  const updateSection = useCallback((key: SectionKey, value: string) => {
    setSections((prev) => ({ ...prev, [key]: value }));
    setSaveState("idle");
  }, []);

  const onToolbarAnchor = useCallback((el: HTMLElement | null) => {
    setAnchorEl(el);
  }, []);

  function changeLine(lineId: string, text: string) {
    setOverlays((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, text, originalText: l.originalText ?? l.text } : l)),
    );
    setSaveState("idle");
  }

  function resetLine(lineId: string) {
    setOverlays((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, text: l.originalText ?? l.text } : l)),
    );
    setSaveState("idle");
  }

  function sectionBodyLines(section: string) {
    return overlays
      .filter((l) => l.section === section && !l.isHeader)
      .sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
  }

  function getSectionText(section: string) {
    return sectionBodyLines(section)
      .map((l) => l.text)
      .join("\n");
  }

  function setSectionText(section: string, text: string) {
    const body = sectionBodyLines(section);
    if (!body.length) return;
    const parts = text.replace(/\r\n/g, "\n").split("\n");
    setOverlays((prev) => {
      const next = prev.map((l) => ({ ...l }));
      body.forEach((line, i) => {
        const idx = next.findIndex((l) => l.id === line.id);
        if (idx < 0) return;
        let value = "";
        if (i < body.length - 1) {
          value = parts[i] ?? "";
        } else {
          // Last line absorbs remaining content so line count stays stable
          value = parts.slice(i).join("\n");
        }
        next[idx] = {
          ...next[idx],
          text: value,
          originalText: next[idx].originalText ?? next[idx].text,
        };
      });
      return next;
    });
    setSaveState("idle");
  }

  function resetSection(section: string) {
    setOverlays((prev) =>
      prev.map((l) =>
        l.section === section ? { ...l, text: l.originalText ?? l.text } : l,
      ),
    );
    setSaveState("idle");
  }

  const selectedLine = pdfMode && selectedLineId ? overlays.find((l) => l.id === selectedLineId) : null;
  const activePdfSection = selectedSection || selectedLine?.section || null;
  const pdfSectionText = activePdfSection ? getSectionText(activePdfSection) : "";

  const detectedSections = useMemo(() => {
    const keys: string[] = [];
    for (const l of overlays) {
      const s = l.section || "personal_information";
      if (!keys.includes(s)) keys.push(s);
    }
    return keys;
  }, [overlays]);

  async function handleSave() {
    setActionError(null);
    setSaveState("saving");
    try {
      await saveDraft(id, sections, overlays);
      setSaveState("saved");
    } catch (err) {
      setSaveState("idle");
      setActionError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function runImprove(opts?: { finding?: Finding }) {
    setActionError(null);
    let text = "";
    let target = "selection";
    let mode: "line" | "section" = "section";
    if (pdfMode) {
      if (activePdfSection) {
        text = getSectionText(activePdfSection).trim();
        target = activePdfSection;
        mode = "section";
      } else if (selectedLineId) {
        text = overlays.find((l) => l.id === selectedLineId)?.text.trim() || "";
        target = selectedLineId;
        mode = "line";
      }
    } else {
      const section =
        activeBlock === "name" || activeBlock === "contact"
          ? "personal_information"
          : (activeBlock as SectionKey);
      text =
        section === "personal_information"
          ? sections.personal_information.trim()
          : sections[section]?.trim() || "";
      target = section;
      mode = "section";
    }
    if (!text) {
      setActionError(pdfMode ? "Select a CV section on the PDF first." : "Select a block with text first.");
      return;
    }
    setBusy("improve");
    try {
      await saveDraft(id, sections, overlays);
      const result = await improveDraftText(id, {
        section: opts?.finding?.section || (pdfMode ? activePdfSection || "overall" : target),
        text,
        instruction: instruction.trim() || null,
        finding_title: opts?.finding?.title ?? null,
        finding_detail: opts?.finding?.detail ?? null,
      });
      setSuggestion({ target, mode, text: result.improved });
      setPanelOpen(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Improve failed");
    } finally {
      setBusy(null);
    }
  }

  function acceptSuggestion() {
    if (!suggestion) return;
    if (pdfMode && suggestion.mode === "section") {
      setSectionText(suggestion.target, suggestion.text);
    } else if (pdfMode && overlays.some((l) => l.id === suggestion.target)) {
      changeLine(suggestion.target, suggestion.text);
    } else if (suggestion.target in EMPTY || suggestion.target === "personal_information") {
      updateSection(suggestion.target as SectionKey, suggestion.text);
    }
    setSuggestion(null);
  }

  async function handleReevaluate() {
    setActionError(null);
    setBusy("reeval");
    try {
      const raw = pdfMode ? overlaysToText(overlays) : undefined;
      await reevaluateDraft(id, { sections, overlays, raw_text: raw });
      setSaveState("saved");
      startTransition(async () => {
        const rep = await getReport(id);
        setReport(rep);
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Re-check failed");
    } finally {
      setBusy(null);
    }
  }

  if (loadError) {
    return (
      <main className="container" style={{ padding: "3rem 0" }}>
        <section className="panel">
          <h1 className="display" style={{ marginTop: 0 }}>
            Could not open editor
          </h1>
          <p style={{ color: "var(--muted)" }}>{loadError}</p>
          <Link className="btn btn-primary" href={studioPath(`/evaluations/${id}`)}>
            Back to report
          </Link>
        </section>
      </main>
    );
  }

  if (!loaded) {
    return (
      <div className="canva-studio">
        <div className="canva-loading">Opening canvas…</div>
      </div>
    );
  }

  const overall = report?.scores?.overall;

  return (
    <div className="canva-studio">
      <header className="canva-topbar">
        <div className="canva-topbar-left">
          <Link href={studioPath(`/evaluations/${id}`)} className="canva-back">
            ← Report
          </Link>
          <div className="canva-file">
            <span className="canva-file-label">{pdfMode ? "Your PDF" : "Editing"}</span>
            <strong>{filename}</strong>
          </div>
        </div>

        <div className="canva-topbar-center">
          <button type="button" className="canva-icon-btn" onClick={() => setZoom((z) => Math.max(0.55, +(z - 0.08).toFixed(2)))}>
            −
          </button>
          <span className="canva-zoom">{Math.round(zoom * 100)}%</span>
          <button type="button" className="canva-icon-btn" onClick={() => setZoom((z) => Math.min(1.2, +(z + 0.08).toFixed(2)))}>
            +
          </button>
        </div>

        <div className="canva-topbar-right">
          {overall != null && (
            <span className="canva-score-chip">
              Score <b>{overall}</b>
            </span>
          )}
          <button type="button" className="canva-tool-btn" onClick={handleSave} disabled={saveState === "saving" || !!busy}>
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save"}
          </button>
          <button type="button" className="canva-tool-btn primary" onClick={handleReevaluate} disabled={busy === "reeval"}>
            {busy === "reeval" ? "Scoring…" : "Re-check"}
          </button>
          <button type="button" className={`canva-tool-btn ${panelOpen ? "active" : ""}`} onClick={() => setPanelOpen((v) => !v)}>
            AI
          </button>
        </div>
      </header>

      {actionError && <div className="canva-banner error">{actionError}</div>}
      {!hasFile && (
        <div className="canva-banner">
          Original file is not stored for this evaluation. Re-upload a PDF to edit on the real CV page.
        </div>
      )}
      {hasFile && fileType !== "pdf" && (
        <div className="canva-banner">DOCX opens as a text canvas. Upload a PDF to edit on the original layout.</div>
      )}

      <div className={`canva-body ${panelOpen ? "with-panel" : ""}`}>
        <div className="canva-workspace">
          <FloatingToolbar
            anchor={pdfMode ? (selectedLineId ? anchorEl : null) : activeBlock ? anchorEl : null}
            busy={busy === "improve"}
            onImprove={() => void runImprove()}
          />

          <div className="canva-page-wrap" style={{ transform: `scale(${zoom})` }}>
            {pdfMode ? (
              <PdfCvCanvas
                fileUrl={evaluationFileUrl(id)}
                overlays={overlays}
                selectedId={selectedLineId}
                selectedSection={selectedSection}
                onSelectLine={setSelectedLineId}
                onSelectSection={setSelectedSection}
                onOverlaysReady={(lines) => {
                  setOverlays(lines);
                  setSaveState("idle");
                }}
                onAnchor={onToolbarAnchor}
              />
            ) : (
              <article className="canva-page" aria-label="CV canvas">
                <EditableBlock
                  blockId="name"
                  value={personal.name}
                  placeholder="Your full name"
                  className="cv-name"
                  multiline={false}
                  selected={activeBlock === "name"}
                  onSelect={() => setActiveBlock("name")}
                  onChange={(name) => setPersonalParts(name, personal.contact)}
                  onToolbarAnchor={onToolbarAnchor}
                />
                <EditableBlock
                  blockId="contact"
                  value={personal.contact}
                  placeholder="Email · Phone · City · LinkedIn"
                  className="cv-contact"
                  selected={activeBlock === "contact"}
                  onSelect={() => setActiveBlock("contact")}
                  onChange={(contact) => setPersonalParts(personal.name, contact)}
                  onToolbarAnchor={onToolbarAnchor}
                />
                {BODY_SECTIONS.map(({ key, label }) => (
                  <section key={key} className="cv-page-section">
                    <h2 className="cv-section-title">{label}</h2>
                    <EditableBlock
                      blockId={key}
                      value={sections[key]}
                      placeholder={`Click to add ${label.toLowerCase()}…`}
                      className={key === "skills" ? "cv-body cv-skills" : "cv-body"}
                      selected={activeBlock === key}
                      onSelect={() => setActiveBlock(key)}
                      onChange={(v) => updateSection(key, v)}
                      onToolbarAnchor={onToolbarAnchor}
                    />
                  </section>
                ))}
              </article>
            )}
          </div>
        </div>

        {panelOpen && (
          <aside className="canva-sidepanel">
            <div className="canva-sidepanel-head">
              <h2>Magic Studio</h2>
              <p>
                {pdfMode
                  ? "Sections are outlined on the PDF. Click a section band or line, then edit the whole section here."
                  : "Click text on the page, then improve with AI."}
              </p>
            </div>

            {pdfMode && detectedSections.length > 0 && (
              <div className="canva-side-block">
                <div className="canva-side-label">Detected sections</div>
                <div className="canva-section-chips">
                  {detectedSections.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`canva-section-chip ${activePdfSection === s ? "active" : ""}`}
                      onClick={() => {
                        setSelectedSection(s);
                        const first = overlays.find((l) => l.section === s);
                        setSelectedLineId(first?.id ?? null);
                      }}
                    >
                      {s.replaceAll("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="canva-side-block">
              <div className="canva-side-label">Selected</div>
              <div className="canva-selected-chip">
                {pdfMode
                  ? activePdfSection
                    ? activePdfSection.replaceAll("_", " ")
                    : "Nothing selected"
                  : activeBlock
                    ? activeBlock.replaceAll("_", " ")
                    : "Nothing selected"}
              </div>
            </div>

            {pdfMode && activePdfSection && (
              <div className="canva-side-block">
                <label htmlFor="section-edit">Edit section</label>
                <textarea
                  id="section-edit"
                  rows={8}
                  value={pdfSectionText}
                  onChange={(e) => setSectionText(activePdfSection, e.target.value)}
                  placeholder="Section body…"
                />
                <button
                  type="button"
                  className="canva-tool-btn wide"
                  style={{ marginTop: "0.45rem" }}
                  onClick={() => resetSection(activePdfSection)}
                >
                  Reset section to original
                </button>
              </div>
            )}

            {pdfMode && selectedLine && (
              <div className="canva-side-block">
                <label htmlFor="line-edit">Fine-tune one line</label>
                <textarea
                  id="line-edit"
                  rows={3}
                  value={selectedLine.text}
                  onChange={(e) => changeLine(selectedLine.id, e.target.value)}
                  placeholder="Edit this line…"
                />
                {selectedLine.originalText != null &&
                  selectedLine.text.trim() !== selectedLine.originalText.trim() && (
                    <button
                      type="button"
                      className="canva-tool-btn wide"
                      style={{ marginTop: "0.45rem" }}
                      onClick={() => resetLine(selectedLine.id)}
                    >
                      Reset line
                    </button>
                  )}
              </div>
            )}

            <div className="canva-side-block">
              <label htmlFor="magic-note">Direction (optional)</label>
              <textarea
                id="magic-note"
                rows={3}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. stronger verbs, shorter bullets, more ATS keywords"
              />
              <button
                type="button"
                className="canva-tool-btn primary wide"
                disabled={busy === "improve" || (pdfMode ? !activePdfSection : !activeBlock)}
                onClick={() => void runImprove()}
              >
                {busy === "improve" ? "Generating…" : "Magic write section"}
              </button>
            </div>

            {suggestion && (
              <div className="canva-suggestion">
                <div className="canva-side-label">Preview</div>
                <pre>{suggestion.text}</pre>
                <div className="canva-suggestion-actions">
                  <button type="button" className="canva-tool-btn primary" onClick={acceptSuggestion}>
                    Apply to PDF
                  </button>
                  <button type="button" className="canva-tool-btn" onClick={() => setSuggestion(null)}>
                    Discard
                  </button>
                </div>
              </div>
            )}

            <div className="canva-side-block">
              <div className="canva-side-label">Fix from report</div>
              {!actionableFindings.length ? (
                <p className="canva-muted">No findings yet — run Re-check after edits.</p>
              ) : (
                <ul className="canva-findings">
                  {actionableFindings.slice(0, 10).map((f, i) => (
                    <li key={`${f.type}-${i}`}>
                      <div className="canva-finding-title">
                        <span className={`pill ${f.type}`}>{f.type}</span>
                        {f.title}
                      </div>
                      <p>{f.detail}</p>
                      <button
                        type="button"
                        className="canva-tool-btn"
                        disabled={busy === "improve" || (pdfMode && !activePdfSection)}
                        onClick={() => {
                          if (f.section) setSelectedSection(f.section);
                          void runImprove({ finding: f });
                        }}
                      >
                        Fix section
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
