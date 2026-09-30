"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DirectEditCvPreview } from "@/components/cv-templates/DirectEditCvPreview";
import { EditorLeftRail } from "@/components/editor/EditorLeftRail";
import {
  DesignPanel,
  FixResumePanel,
  HistoryPanel,
  RearrangePanel,
  TailorPanel,
  TemplatesPanel,
  type EditorPanel,
} from "@/components/editor/EditorPanels";
import { EditorToolbox, gradeFromOverall } from "@/components/editor/EditorToolbox";
import {
  exportCvUrl,
  generateRewrite,
  getReport,
  getRewrite,
  improveDraftText,
  reevaluateDraft,
  updateRewrite,
  type Report,
  type StructuredCv,
  type TemplateId,
} from "@/lib/api";
import { structuredCvToRawText } from "@/lib/cv-text";
import { isBodySectionId } from "@/lib/cv-types";
import { layoutSplitFromKind, moveSectionColumn, moveSectionOrder, placeSectionRelative } from "@/lib/section-order";
import { getTheme } from "@/lib/templates";

type Snapshot = {
  id: string;
  label: string;
  at: string;
  content: StructuredCv;
  templateId: TemplateId;
};

function cloneCv(cv: StructuredCv): StructuredCv {
  return JSON.parse(JSON.stringify(cv)) as StructuredCv;
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function BuildEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [content, setContent] = useState<StructuredCv | null>(null);
  const [templateId, setTemplateId] = useState<TemplateId>("classic");
  const [preference, setPreference] = useState<"ats" | "visual">("ats");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenBusy, setRegenBusy] = useState(false);
  const [panel, setPanel] = useState<EditorPanel>(null);

  const [report, setReport] = useState<Report | null>(null);
  const [fixBusy, setFixBusy] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);

  const [jobText, setJobText] = useState("");
  const [tailorBusy, setTailorBusy] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [tailorSuggestions, setTailorSuggestions] = useState<{
    matchNote: string;
    summary?: string;
    skills?: string;
    bullets: string[];
  } | null>(null);

  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [historyLog, setHistoryLog] = useState<Snapshot[]>([]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<StructuredCv | null>(null);
  const templateRef = useRef<TemplateId>("classic");
  const skipHistory = useRef(false);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  useEffect(() => {
    templateRef.current = templateId;
  }, [templateId]);

  const persist = useCallback(
    async (nextContent: StructuredCv, nextTemplate: TemplateId) => {
      setSaveState("saving");
      try {
        await updateRewrite(id, { content: nextContent, template_id: nextTemplate });
        setSaveState("saved");
      } catch (err) {
        setSaveState("error");
        setError(err instanceof Error ? err.message : "Save failed");
      }
    },
    [id],
  );

  const scheduleSave = useCallback(
    (nextContent: StructuredCv, nextTemplate: TemplateId) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void persist(nextContent, nextTemplate);
      }, 700);
    },
    [persist],
  );

  const pushHistory = useCallback((label: string, cv: StructuredCv, tpl: TemplateId) => {
    const snap: Snapshot = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label,
      at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      content: cloneCv(cv),
      templateId: tpl,
    };
    setPast((p) => [...p.slice(-40), snap]);
    setFuture([]);
    setHistoryLog((h) => [snap, ...h].slice(0, 30));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let row;
        try {
          row = await getRewrite(id);
        } catch {
          row = await generateRewrite(id);
        }
        if (cancelled) return;
        setContent(row.content);
        setTemplateId(row.template_id);
        if (row.meta?.preference === "visual" || row.meta?.preference === "ats") {
          setPreference(row.meta.preference);
        }
        setLoading(false);
        try {
          const r = await getReport(id);
          if (!cancelled) setReport(r);
        } catch {
          /* blank resumes may not have a report yet */
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load resume");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [id]);

  function applyContent(next: StructuredCv, label = "Edit", opts?: { template?: TemplateId }) {
    const tpl = opts?.template ?? templateRef.current;
    if (!skipHistory.current && contentRef.current) {
      pushHistory(label, contentRef.current, templateRef.current);
    }
    skipHistory.current = false;
    setContent(next);
    if (opts?.template) setTemplateId(opts.template);
    scheduleSave(next, tpl);
  }

  function patch(updater: (prev: StructuredCv) => StructuredCv) {
    setContent((prev) => {
      if (!prev) return prev;
      if (!skipHistory.current) {
        pushHistory("Edit", prev, templateRef.current);
      }
      skipHistory.current = false;
      const next = updater(prev);
      scheduleSave(next, templateRef.current);
      return next;
    });
  }

  function onTemplate(next: TemplateId) {
    if (contentRef.current) {
      pushHistory("Template change", contentRef.current, templateRef.current);
    }
    setTemplateId(next);
    if (contentRef.current) scheduleSave(contentRef.current, next);
  }

  function onUndo() {
    setPast((p) => {
      if (!p.length || !contentRef.current) return p;
      const prev = p[p.length - 1];
      const current: Snapshot = {
        id: `cur-${Date.now()}`,
        label: "Current",
        at: "",
        content: cloneCv(contentRef.current),
        templateId: templateRef.current,
      };
      setFuture((f) => [...f, current]);
      skipHistory.current = true;
      setContent(prev.content);
      setTemplateId(prev.templateId);
      scheduleSave(prev.content, prev.templateId);
      return p.slice(0, -1);
    });
  }

  function onRedo() {
    setFuture((f) => {
      if (!f.length || !contentRef.current) return f;
      const next = f[f.length - 1];
      const current: Snapshot = {
        id: `cur-${Date.now()}`,
        label: "Current",
        at: "",
        content: cloneCv(contentRef.current),
        templateId: templateRef.current,
      };
      setPast((p) => [...p, current]);
      skipHistory.current = true;
      setContent(next.content);
      setTemplateId(next.templateId);
      scheduleSave(next.content, next.templateId);
      return f.slice(0, -1);
    });
  }

  function restoreSnapshot(snapId: string) {
    const snap = historyLog.find((h) => h.id === snapId);
    if (!snap || !contentRef.current) return;
    pushHistory("Before restore", contentRef.current, templateRef.current);
    skipHistory.current = true;
    setContent(snap.content);
    setTemplateId(snap.templateId);
    scheduleSave(snap.content, snap.templateId);
    setPanel(null);
  }

  async function onRegenerate() {
    setRegenBusy(true);
    setError(null);
    try {
      if (contentRef.current) pushHistory("Before AI rewrite", contentRef.current, templateRef.current);
      const row = await generateRewrite(id, contentRef.current || undefined);
      skipHistory.current = true;
      setContent(row.content);
      setTemplateId(row.template_id);
      setSaveState("saved");

      // Refresh evaluation so Fix Resume / score reflects resolved issues.
      const raw = structuredCvToRawText(row.content);
      await reevaluateDraft(id, { raw_text: raw });
      const r = await getReport(id);
      setReport(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setRegenBusy(false);
    }
  }

  async function runFixScore() {
    if (!contentRef.current) return;
    setFixBusy(true);
    setFixError(null);
    try {
      const raw = structuredCvToRawText(contentRef.current);
      await reevaluateDraft(id, { raw_text: raw });
      const r = await getReport(id);
      setReport(r);
    } catch (err) {
      setFixError(err instanceof Error ? err.message : "Score failed");
    } finally {
      setFixBusy(false);
    }
  }

  async function runTailor() {
    if (!contentRef.current) return;
    const jd = jobText.trim();
    if (jd.length < 40) return;
    setTailorBusy(true);
    setTailorError(null);
    setTailorSuggestions(null);
    try {
      const cv = contentRef.current;
      const instruction =
        "Tailor this resume text for the job description below. Keep facts true. Prefer keywords from the JD when honest.\n\nJOB DESCRIPTION:\n" +
        jd.slice(0, 8000);

      const [summaryRes, skillsRes, bulletRes] = await Promise.all([
        improveDraftText(id, {
          text: cv.summary || "Professional seeking this role.",
          section: "summary",
          instruction,
        }),
        improveDraftText(id, {
          text: cv.skills.join(", ") || "Relevant skills",
          section: "skills",
          instruction: instruction + "\nReturn a comma-separated skills list only.",
        }),
        improveDraftText(id, {
          text:
            cv.experience[0]?.bullets.join("\n") ||
            "Led initiatives aligned with team goals.\nDelivered measurable outcomes.",
          section: "experience",
          instruction: instruction + "\nReturn 3 strong bullet lines, one per line, no numbering.",
        }),
      ]);

      const bullets = bulletRes.improved
        .split("\n")
        .map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 5);

      setTailorSuggestions({
        matchNote:
          "Suggestions ready. Apply summary/skills if they fit, then tweak bullets on the CV. Re-run Fix Resume to refresh your score.",
        summary: summaryRes.improved.trim(),
        skills: skillsRes.improved.trim(),
        bullets,
      });
    } catch (err) {
      setTailorError(err instanceof Error ? err.message : "Tailor failed");
    } finally {
      setTailorBusy(false);
    }
  }

  async function onPreference(next: "ats" | "visual") {
    setPreference(next);
    try {
      await updateRewrite(id, { meta: { preference: next } });
    } catch {
      /* non-blocking */
    }
  }

  if (loading) {
    return (
      <div className="editor-page">
        <header className="editor-topbar">
          <Link href="/" className="editor-brand">
            <span className="builder-mark" aria-hidden />
            <strong>Bluexech Resume</strong>
          </Link>
        </header>
        <main className="editor-loading">Loading resume…</main>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="editor-page">
        <header className="editor-topbar">
          <Link href="/" className="editor-brand">
            <span className="builder-mark" aria-hidden />
            <strong>Bluexech Resume</strong>
          </Link>
        </header>
        <main className="editor-loading">
          <p style={{ color: "var(--bad)" }}>{error || "Resume not found"}</p>
          <Link href="/build" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Start over
          </Link>
        </main>
      </div>
    );
  }

  const grade = gradeFromOverall(report?.scores.overall);
  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save error" : "";

  return (
    <div className="editor-page">
      <header className="editor-topbar">
        <Link href="/" className="editor-brand">
          <span className="builder-mark" aria-hidden />
          <strong>Bluexech Resume</strong>
        </Link>
        <div className="editor-topbar-actions">
          <Link href={`/evaluations/${id}`} className="btn btn-ghost" style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}>
            Report
          </Link>
          <a className="btn btn-ghost" style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }} href={exportCvUrl(id, "docx", templateId)}>
            DOCX
          </a>
          <a className="btn btn-primary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }} href={exportCvUrl(id, "pdf", templateId)}>
            Download PDF
          </a>
        </div>
      </header>

      <EditorToolbox
        active={panel}
        onOpen={setPanel}
        grade={grade}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onUndo={onUndo}
        onRedo={onRedo}
        saveLabel={saveLabel}
      />

      <div className="editor-workspace">
        <EditorLeftRail id={id} templateId={templateId} onAiRewrite={() => void onRegenerate()} aiBusy={regenBusy} />

        <div className="editor-canvas-col">
          {error && (
            <p role="alert" className="editor-inline-error">
              {error}
            </p>
          )}
          <div className="editor-canvas-hint">Click any text on the resume to edit</div>
          <div className="editor-canvas-sheet">
            <DirectEditCvPreview cv={content} templateId={templateId} evaluationId={id} onPatch={patch} />
          </div>
        </div>

        {panel === "fix" && (
          <FixResumePanel
            report={report}
            loading={fixBusy}
            error={fixError}
            onRefresh={() => void runFixScore()}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === "tailor" && (
          <TailorPanel
            jobText={jobText}
            onJobText={setJobText}
            busy={tailorBusy}
            error={tailorError}
            suggestions={tailorSuggestions}
            onRun={() => void runTailor()}
            onApplySummary={(text) => applyContent({ ...content, summary: text }, "Apply tailored summary")}
            onApplySkills={(text) =>
              applyContent(
                {
                  ...content,
                  skills: text.split(",").map((s) => s.trim()).filter(Boolean),
                },
                "Apply tailored skills",
              )
            }
            onClose={() => setPanel(null)}
          />
        )}
        {panel === "templates" && (
          <TemplatesPanel cv={content} templateId={templateId} onPick={onTemplate} onClose={() => setPanel(null)} />
        )}
        {panel === "design" && (
          <DesignPanel preference={preference} onPreference={(p) => void onPreference(p)} onClose={() => setPanel(null)} />
        )}
        {panel === "rearrange" && (
          <RearrangePanel
            cv={content}
            split={layoutSplitFromKind(getTheme(templateId).kind)}
            onMoveEntry={(section, from, to) =>
              patch((prev) => {
                if (section === "experience") {
                  return { ...prev, experience: moveItem(prev.experience, from, to) };
                }
                if (section === "education") {
                  return { ...prev, education: moveItem(prev.education, from, to) };
                }
                return { ...prev, projects: moveItem(prev.projects, from, to) };
              })
            }
            onMoveSection={(sectionId, direction) => {
              if (!isBodySectionId(sectionId)) return;
              const split = layoutSplitFromKind(getTheme(templateId).kind);
              patch((prev) => moveSectionOrder(prev, sectionId, direction, split));
            }}
            onMoveColumn={(sectionId, column) => {
              if (!isBodySectionId(sectionId)) return;
              const split = layoutSplitFromKind(getTheme(templateId).kind);
              patch((prev) => moveSectionColumn(prev, sectionId, column, split));
            }}
            onDropRelative={(draggedId, targetId, place) => {
              if (!isBodySectionId(draggedId) || !isBodySectionId(targetId)) return;
              const split = layoutSplitFromKind(getTheme(templateId).kind);
              patch((prev) => placeSectionRelative(prev, draggedId, targetId, place, split));
            }}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === "history" && (
          <HistoryPanel
            entries={historyLog.map((h) => ({ id: h.id, label: h.label, at: h.at }))}
            onRestore={restoreSnapshot}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
    </div>
  );
}
