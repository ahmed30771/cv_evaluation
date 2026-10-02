"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createEvaluation } from "@/lib/api";
import { BuilderChrome } from "@/components/BuilderChrome";
import { studioPath } from "@/lib/site";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = [".pdf", ".docx"];

export default function EvaluatePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = useCallback((f: File): string | null => {
    const name = f.name.toLowerCase();
    if (!ALLOWED.some((ext) => name.endsWith(ext))) return "Only PDF and DOCX files are supported.";
    if (f.size <= 0) return "Please choose a CV file.";
    if (f.size > MAX_BYTES) return "File must be 5 MB or smaller.";
    return null;
  }, []);

  const onPick = useCallback(
    (f: File | null) => {
      if (!f) return;
      const err = validate(f);
      setError(err);
      setFile(err ? null : f);
    },
    [validate],
  );

  const onSubmit = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { id } = await createEvaluation(file);
      router.push(studioPath(`/evaluations/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setLoading(false);
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

        {error && (
          <p role="alert" className="sq-alert">
            {error}
          </p>
        )}

        <div className="sq-actions">
          <button type="button" className="btn btn-primary" disabled={!file || loading} onClick={() => void onSubmit()}>
            {loading ? "Evaluating…" : "Evaluate CV"}
          </button>
        </div>
      </main>
    </BuilderChrome>
  );
}
