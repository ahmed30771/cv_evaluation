"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createEvaluation } from "@/lib/api";
import { BuilderChrome } from "@/components/BuilderChrome";

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
      router.push(`/evaluations/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setLoading(false);
    }
  };

  return (
    <BuilderChrome
      subtitle="Evaluate"
      actions={
        <Link href="/build" className="btn btn-primary" style={{ padding: "0.45rem 0.9rem", fontSize: "0.92rem" }}>
          Build resume
        </Link>
      }
    >
      <main className="container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem", maxWidth: 720 }}>
        <h1 className="display" style={{ margin: "0 0 0.5rem", fontSize: "clamp(1.8rem, 4vw, 2.4rem)" }}>
          Score your CV
        </h1>
        <p style={{ margin: "0 0 1.5rem", color: "var(--muted)" }}>
          Get ATS and content scores, then open the builder to generate a fixed resume.
        </p>

        <div
          className={`dropzone ${dragActive ? "active" : ""}`}
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
          <p style={{ margin: 0, fontWeight: 600 }}>Drag & drop your CV here</p>
          <p style={{ margin: "0.4rem 0 1rem", color: "var(--muted)" }}>PDF or DOCX · max 5 MB</p>
          <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()}>
            Browse files
          </button>
          {file && <p style={{ margin: "0.75rem 0 0", fontWeight: 600 }}>{file.name}</p>}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            hidden
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </div>

        {error && (
          <p role="alert" style={{ color: "var(--bad)", marginTop: "0.85rem" }}>
            {error}
          </p>
        )}

        <div style={{ marginTop: "1.1rem" }}>
          <button type="button" className="btn btn-primary" disabled={!file || loading} onClick={() => void onSubmit()}>
            {loading ? "Evaluating…" : "Evaluate CV"}
          </button>
        </div>
      </main>
    </BuilderChrome>
  );
}
