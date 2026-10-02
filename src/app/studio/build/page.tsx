"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BuilderChrome } from "@/components/BuilderChrome";
import { TemplateThumb } from "@/components/cv-templates/CvTemplatePreview";
import {
  createBlankResume,
  createEvaluation,
  generateRewrite,
  getEvaluation,
  updateRewrite,
  type TemplateId,
} from "@/lib/api";
import { TEMPLATES } from "@/lib/templates";
import { TEMPLATE_PREVIEW_SAMPLE } from "@/lib/template-preview-sample";
import { studioPath } from "@/lib/site";

type Pref = "ats" | "visual";

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="wizard-steps" aria-label={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <span key={n} className={`wizard-dot ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
            {n}
          </span>
        );
      })}
    </div>
  );
}

export default function BuildWizardPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  /** 1 ask · 2 upload · 3 preference · 4 gallery */
  const [step, setStep] = useState(1);
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preference, setPreference] = useState<Pref>("ats");
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickingId, setPickingId] = useState<TemplateId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    if (preference === "ats") return TEMPLATES.filter((t) => t.badge === "ATS recommended");
    return TEMPLATES.filter((t) => t.badge === "Visual");
  }, [preference]);

  const totalSteps = hasResume === true ? 4 : 3;
  const visibleStep =
    step === 1 ? 1 : step === 2 ? 2 : step === 3 ? (hasResume === true ? 3 : 2) : hasResume === true ? 4 : 3;

  const prepareFromUpload = useCallback(async () => {
    if (!file) throw new Error("Choose a PDF or DOCX file first.");
    setStatusMsg("Uploading and evaluating…");
    const { id } = await createEvaluation(file);
    for (let i = 0; i < 90; i++) {
      const s = await getEvaluation(id);
      if (s.status === "completed") break;
      if (s.status === "failed") throw new Error(s.error_message || "Evaluation failed");
      setStatusMsg(s.status === "evaluating" ? "AI is analyzing your CV…" : "Extracting text…");
      await new Promise((r) => setTimeout(r, 2000));
    }
    setStatusMsg("Building an improved resume draft…");
    await generateRewrite(id);
    await updateRewrite(id, {
      meta: { preference, source: "upload" },
      template_id: preference === "visual" ? "sidebar" : "classic",
    });
    setResumeId(id);
    return id;
  }, [file, preference]);

  const prepareBlank = useCallback(async () => {
    setStatusMsg("Creating a blank resume…");
    const row = await createBlankResume({
      preference,
      template_id: preference === "visual" ? "sidebar" : "classic",
    });
    setResumeId(row.id);
    return row.id;
  }, [preference]);

  async function choosePreference(next: Pref) {
    setPreference(next);
    setError(null);
    setBusy(true);
    try {
      if (hasResume === true) await prepareFromUpload();
      else await prepareBlank();
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start resume");
    } finally {
      setBusy(false);
      setStatusMsg(null);
    }
  }

  async function pickTemplate(templateId: TemplateId) {
    if (!resumeId || busy) return;
    const meta = TEMPLATES.find((t) => t.id === templateId);
    setPickingId(templateId);
    setBusy(true);
    setError(null);
    setStatusMsg(`Opening ${meta?.label || "template"}…`);
    try {
      await updateRewrite(resumeId, { template_id: templateId });
      router.push(studioPath(`/build/${resumeId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save template");
      setBusy(false);
      setPickingId(null);
      setStatusMsg(null);
    }
  }

  return (
    <BuilderChrome
      subtitle="Build"
      actions={
        <Link href={studioPath("/evaluate")} className="btn btn-ghost btn-compact">
          Score a CV
        </Link>
      }
    >
      <main className="wizard-wrap">
        <div className="wizard-progress">
          <p className="wizard-progress-label">
            Step {visibleStep} of {totalSteps}
          </p>
          <StepDots step={visibleStep} total={totalSteps} />
        </div>

        {error && (
          <p role="alert" className="wizard-error">
            {error}
          </p>
        )}
        {statusMsg && <p className="wizard-status">{statusMsg}</p>}

        {step === 1 && (
          <section className="wizard-card sq-rise">
            <h1 className="wizard-title">Do you have an existing resume?</h1>
            <p className="wizard-lead">Import it as a starting point, or build from a blank page.</p>
            <div className="wizard-choice-row">
              <button
                type="button"
                className="btn btn-primary wizard-choice"
                onClick={() => {
                  setHasResume(true);
                  setStep(2);
                }}
              >
                Yes — import
              </button>
              <button
                type="button"
                className="btn btn-ghost wizard-choice"
                onClick={() => {
                  setHasResume(false);
                  setFile(null);
                  setStep(3);
                }}
              >
                No — start blank
              </button>
            </div>
          </section>
        )}

        {step === 2 && hasResume && (
          <section className="wizard-card sq-rise">
            <h1 className="wizard-title">Upload your resume</h1>
            <p className="wizard-lead">PDF or DOCX, max 5 MB. We extract content and draft an improved version.</p>
            <div className="sq-dropzone">
              <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()}>
                Browse files
              </button>
              {file && <p className="sq-file-name">{file.name}</p>}
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="wizard-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="btn btn-primary" disabled={!file} onClick={() => setStep(3)}>
                Next
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="wizard-card sq-rise">
            <h1 className="wizard-title">What matters more right now?</h1>
            <p className="wizard-lead">
              Pass ATS shows Classic/Compact-style layouts. Look polished shows visual templates.
            </p>
            <div className="wizard-choice-row">
              <button
                type="button"
                className="btn btn-primary wizard-choice"
                disabled={busy}
                onClick={() => void choosePreference("ats")}
              >
                {busy && preference === "ats" ? "Working…" : "Pass ATS"}
              </button>
              <button
                type="button"
                className="btn btn-ghost wizard-choice"
                disabled={busy}
                onClick={() => void choosePreference("visual")}
              >
                {busy && preference === "visual" ? "Working…" : "Look polished"}
              </button>
            </div>
            <div className="wizard-nav">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(hasResume ? 2 : 1)}
                disabled={busy}
              >
                Back
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className={`sq-rise ${busy ? "is-entering-template" : ""}`}>
            <h1 className="wizard-title" style={{ textAlign: "center" }}>
              Pick a template
            </h1>
            <p className="wizard-lead" style={{ textAlign: "center", margin: "0 auto 1.5rem" }}>
              {preference === "ats"
                ? "ATS-friendly layouts only — you can switch later in Design."
                : "Visual layouts only — you can switch later in Design."}
            </p>
            <div className="template-gallery">
              {filteredTemplates.map((t) => (
                <TemplateThumb
                  key={t.id}
                  cv={TEMPLATE_PREVIEW_SAMPLE}
                  templateId={t.id}
                  label={t.label}
                  badge={t.badge}
                  active={pickingId === t.id}
                  disabled={busy}
                  onClick={() => void pickTemplate(t.id)}
                />
              ))}
            </div>
          </section>
        )}

        {busy && pickingId && (
          <div className="template-enter-overlay" role="status" aria-live="polite">
            <div className="template-enter-card">
              <div className="template-enter-spinner" aria-hidden />
              <strong>Opening template</strong>
              <p>
                {TEMPLATES.find((t) => t.id === pickingId)?.label || "Selected design"} — setting up your editor…
              </p>
            </div>
          </div>
        )}
      </main>
    </BuilderChrome>
  );
}
