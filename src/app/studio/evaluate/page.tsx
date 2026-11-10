"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createEvaluation, waitForEvaluation } from "@/lib/api";
import { BuilderChrome } from "@/components/BuilderChrome";
import { studioPath } from "@/lib/site";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = [".pdf", ".docx"];

const PHASES = [
  { key: "uploaded", label: "Uploading" },
  { key: "extracting", label: "Reading CV" },
  { key: "evaluating", label: "Scoring" },
] as const;

const TIPS = [
  "Checking ATS headings and keyword clarity…",
  "Reviewing experience bullets for impact…",
  "Scoring skills, content, and formatting…",
  "Building your detailed findings report…",
];

function phaseIndex(status: string): number {
  const order = ["uploaded", "extracting", "evaluating", "completed"];
  const i = order.indexOf(status);
  return i < 0 ? 0 : Math.min(i, 2);
}

export default function EvaluatePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("uploaded");
  const [tipIndex, setTipIndex] = useState(0);

  const validate = useCallback((f: File): string | null => {
    const name = f.name.toLowerCase();
    if (!ALLOWED.some((ext) => name.endsWith(ext))) return "Only PDF and DOCX files are supported.";
    if (f.size <= 0) return "Please choose a CV file.";
    if (f.size > MAX_BYTES) return "File must be 5 MB or smaller.";
    return null;
  }, []);

  const onPick = useCallback(
    (f: File | null) => {
      if (!f || loading) return;
      const err = validate(f);
      setError(err);
      setFile(err ? null : f);
    },
    [validate, loading],
  );

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [loading]);

  const activePhase = useMemo(() => phaseIndex(status), [status]);
  const progressPct = useMemo(() => {
    if (status === "completed") return 100;
    if (status === "evaluating") return 72;
    if (status === "extracting") return 42;
    return 18;
  }, [status]);

  const headline =
    status === "evaluating"
      ? "AI is scoring your CV"
      : status === "extracting"
        ? "Extracting your content"
        : "Uploading your file";

  const onSubmit = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setStatus("uploaded");
    setTipIndex(0);
    try {
      const { id } = await createEvaluation(file);
      setStatus("extracting");
      await waitForEvaluation(id, {
        onStatus: (next) => setStatus(next),
      });
      setStatus("completed");
      router.push(studioPath(`/evaluations/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setLoading(false);
      setStatus("uploaded");
    }
  };

  return (
    <BuilderChrome
      subtitle="Score"
      actions={
        <Link href={studioPath("/build")} className="btn btn-primary btn-compact">
          Build resume
        </Link>
      }
    >
      <main className="sq-page">
        <p className="sq-kicker sq-rise">Evaluate</p>
        <h1 className="sq-title sq-rise">Score your CV</h1>
        <p className="sq-lead sq-rise">
          Get ATS and content scores, then open the builder to generate a fixed resume.
        </p>

        {loading ? (
          <section className="sq-eval-loading sq-rise" aria-live="polite" aria-busy="true">
            <div className="sq-eval-loading-visual" aria-hidden="true">
              <div className="sq-eval-orbit sq-eval-orbit-a" />
              <div className="sq-eval-orbit sq-eval-orbit-b" />
              <div className="sq-eval-core">
                <span className="sq-eval-core-score">AI</span>
                <span className="sq-eval-core-pulse" />
              </div>
              <div className="sq-eval-scan" />
            </div>

            <div className="sq-eval-loading-copy">
              <p className="sq-kicker" style={{ marginBottom: "0.35rem" }}>
                Evaluating
              </p>
              <h2 className="sq-eval-loading-title">{headline}</h2>
              <p className="sq-eval-loading-tip" key={tipIndex}>
                {TIPS[tipIndex]}
              </p>
              {file && <p className="sq-eval-loading-file">{file.name}</p>}
            </div>

            <div className="sq-eval-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct}>
              <div className="sq-eval-progress-bar" style={{ width: `${progressPct}%` }} />
            </div>

            <ol className="sq-eval-steps">
              {PHASES.map((phase, i) => {
                const done = i < activePhase;
                const current = i === activePhase;
                return (
                  <li
                    key={phase.key}
                    className={`sq-eval-step ${done ? "is-done" : ""} ${current ? "is-current" : ""}`}
                  >
                    <span className="sq-eval-step-dot" aria-hidden="true">
                      {done ? "✓" : i + 1}
                    </span>
                    <span>{phase.label}</span>
                  </li>
                );
              })}
            </ol>

            <p className="sq-eval-loading-note">Usually finishes in under a minute — keep this tab open.</p>
          </section>
        ) : (
          <div
            className={`sq-dropzone ${dragActive ? "is-active" : ""} sq-rise-delay`}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              onPick(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <p className="sq-dropzone-title">Drop your CV here</p>
            <p className="sq-dropzone-meta">PDF or DOCX · max 5 MB</p>
            <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()}>
              Browse files
            </button>
            {file && <p className="sq-file-name">{file.name}</p>}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              hidden
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {error && (
          <div role="alert" className="sq-alert-box">
            <p className="sq-alert">{error}</p>
            {/busy|rate-limited|try again/i.test(error) ? (
              <button
                type="button"
                className="btn btn-ghost btn-compact"
                disabled={!file || loading}
                onClick={() => void onSubmit()}
              >
                Try again
              </button>
            ) : null}
          </div>
        )}

        {!loading && (
          <div className="sq-actions">
            <button type="button" className="btn btn-primary" disabled={!file || loading} onClick={() => void onSubmit()}>
              Evaluate CV
            </button>
          </div>
        )}
      </main>
    </BuilderChrome>
  );
}
