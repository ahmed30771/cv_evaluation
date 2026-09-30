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
  type StructuredCv,
  type TemplateId,
} from "@/lib/api";
import { TEMPLATES } from "@/lib/templates";

type Pref = "ats" | "visual";

const SAMPLE: StructuredCv = {
  personal: {
    fullName: "Alex Morgan",
    email: "alex@example.com",
    phone: "+1 555 0100",
    location: "Remote",
    links: ["linkedin.com/in/alex"],
  },
  summary: "Product-minded professional with a track record of shipping clear, measurable outcomes.",
  skills: ["Communication", "Problem solving", "SQL", "Figma"],
  experience: [
    {
      company: "Northwind",
      title: "Role title",
      start: "2022",
      end: "Present",
      bullets: ["Led initiatives that improved delivery speed.", "Partnered with stakeholders to ship features."],
    },
  ],
  education: [{ school: "State University", degree: "B.S. Example", year: "2021" }],
  projects: [],
  certifications: [],
  languages: [],
  awards: [],
  interests: [],
};

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
  const [step, setStep] = useState(1);
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [preference, setPreference] = useState<Pref>("ats");
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [content, setContent] = useState<StructuredCv>(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    if (preference === "ats") return TEMPLATES.filter((t) => t.badge === "ATS recommended");
    return TEMPLATES.filter((t) => t.badge === "Visual");
  }, [preference]);

  const allTemplatesOrdered = useMemo(() => {
    const preferred = filteredTemplates;
    const rest = TEMPLATES.filter((t) => !preferred.some((p) => p.id === t.id));
    return [...preferred, ...rest];
  }, [filteredTemplates]);

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
    const rewrite = await generateRewrite(id);
    await updateRewrite(id, {
      meta: { target_role: role, preference, source: "upload" },
      template_id: preference === "visual" ? "sidebar" : "classic",
    });
    setResumeId(id);
    setContent(rewrite.content);
    return id;
  }, [file, preference, role]);

  const prepareBlank = useCallback(async () => {
    setStatusMsg("Creating a blank resume…");
    const row = await createBlankResume({
      target_role: role,
      preference,
      template_id: preference === "visual" ? "sidebar" : "classic",
    });
    setResumeId(row.id);
    setContent(row.content);
    return row.id;
  }, [preference, role]);

  async function goToGallery() {
    setError(null);
    setBusy(true);
    try {
      if (hasResume === true) await prepareFromUpload();
      else await prepareBlank();
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start resume");
    } finally {
      setBusy(false);
      setStatusMsg(null);
    }
  }

  async function pickTemplate(templateId: TemplateId) {
    if (!resumeId) return;
    setBusy(true);
    setError(null);
    try {
      await updateRewrite(resumeId, { template_id: templateId });
      router.push(`/build/${resumeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save template");
      setBusy(false);
    }
  }

  return (
    <BuilderChrome
      subtitle="Builder"
      actions={
        <Link href="/evaluate" className="btn btn-ghost" style={{ padding: "0.45rem 0.9rem", fontSize: "0.92rem" }}>
          Score a CV
        </Link>
      }
    >
      <main className="container wizard-wrap">
        <StepDots step={step} total={5} />

        {error && (
          <p role="alert" className="wizard-error">
            {error}
          </p>
        )}
        {statusMsg && <p className="wizard-status">{statusMsg}</p>}

        {step === 1 && (
          <section className="wizard-card fade-up">
            <h1 className="display wizard-title">Do you have an existing resume?</h1>
            <p className="wizard-lead">We can import it as a starting point, or you can build from a blank page.</p>
            <div className="wizard-choice-row">
              <button
                type="button"
                className="btn btn-primary wizard-choice"
                onClick={() => {
                  setHasResume(true);
                  setStep(2);
                }}
              >
                Yes
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
                No
              </button>
            </div>
          </section>
        )}

        {step === 2 && hasResume && (
          <section className="wizard-card fade-up">
            <h1 className="display wizard-title">Upload your resume</h1>
            <p className="wizard-lead">PDF or DOCX, max 5 MB. We will extract content and draft an improved version.</p>
            <div className="dropzone" style={{ textAlign: "center" }}>
              <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()}>
                Browse files
              </button>
              {file && <p style={{ margin: "0.75rem 0 0", fontWeight: 600 }}>{file.name}</p>}
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
          <section className="wizard-card fade-up">
            <h1 className="display wizard-title">What role are you targeting?</h1>
            <p className="wizard-lead">Optional — helps you stay focused while editing (tips only in this version).</p>
            <input
              className="wizard-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Software Engineer, Marketing Manager"
            />
            <div className="wizard-nav">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(hasResume ? 2 : 1)}
              >
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(4)}>
                Next
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="wizard-card fade-up">
            <h1 className="display wizard-title">What matters more right now?</h1>
            <p className="wizard-lead">
              Classic/Compact are safer for strict ATS. Sidebar/Split look stronger to humans.
            </p>
            <div className="wizard-choice-row">
              <button
                type="button"
                className={`btn wizard-choice ${preference === "ats" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setPreference("ats")}
              >
                Pass ATS
              </button>
              <button
                type="button"
                className={`btn wizard-choice ${preference === "visual" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setPreference("visual")}
              >
                Look polished
              </button>
            </div>
            <div className="wizard-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(3)} disabled={busy}>
                Back
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void goToGallery()}>
                {busy ? "Working…" : "Choose template"}
              </button>
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="fade-up">
            <h1 className="display wizard-title" style={{ textAlign: "center" }}>
              Pick a template
            </h1>
            <p className="wizard-lead" style={{ textAlign: "center", margin: "0 auto 1.5rem" }}>
              You can switch templates later in the editor.
            </p>
            <div className="template-gallery">
              {allTemplatesOrdered.map((t) => (
                <TemplateThumb
                  key={t.id}
                  cv={content}
                  templateId={t.id}
                  label={t.label}
                  badge={t.badge}
                  onClick={() => void pickTemplate(t.id)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </BuilderChrome>
  );
}
