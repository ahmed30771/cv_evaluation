"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getEvaluation, getReport, type EvaluationStatus, type Finding, type Report } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  uploaded: "Starting…",
  extracting: "Extracting text from your CV…",
  evaluating: "Analyzing with AI…",
  completed: "Complete",
  failed: "Failed",
};

function scoreBand(value: number): string {
  if (value >= 85) return "Excellent";
  if (value >= 70) return "Good";
  if (value >= 55) return "Fair";
  return "Needs work";
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", gap: "1rem" }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span>
          {value}/100 <span style={{ color: "var(--muted)", fontWeight: 500 }}>({scoreBand(value)})</span>
        </span>
      </div>
      <div className="score-bar" aria-hidden>
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function FindingsGroup({
  title,
  items,
  emptyHint,
}: {
  title: string;
  items: Finding[];
  emptyHint?: string;
}) {
  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h3 className="display" style={{ margin: "0 0 0.75rem", fontSize: "1.25rem" }}>
        {title}
        <span style={{ marginLeft: "0.5rem", fontSize: "0.95rem", color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
          ({items.length})
        </span>
      </h3>
      <div className="panel">
        {!items.length && (
          <p style={{ margin: 0, color: "var(--muted)" }}>{emptyHint || "Nothing flagged in this category."}</p>
        )}
        {items.map((f, idx) => (
          <article key={`${f.type}-${idx}`} className={`finding ${f.type === "section_analysis" ? "recommendation" : f.type}`}>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                alignItems: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              <span>{f.type.replace("_", " ")}</span>
              {f.section && (
                <span
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 999,
                    padding: "0.1rem 0.45rem",
                    textTransform: "none",
                    letterSpacing: 0,
                    fontWeight: 600,
                  }}
                >
                  {f.section}
                </span>
              )}
              {f.severity && <span>{f.severity} severity</span>}
            </div>
            <h4 style={{ margin: "0.35rem 0 0.25rem" }}>{f.title}</h4>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{f.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function EvaluationPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [status, setStatus] = useState<EvaluationStatus | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const s = await getEvaluation(id);
        if (cancelled) return;
        setStatus(s);
        if (s.status === "completed") {
          const r = await getReport(id);
          if (!cancelled) setReport(r);
          return;
        }
        if (s.status === "failed") {
          setError(s.error_message || "Evaluation failed.");
          return;
        }
        timer = setTimeout(poll, 2500);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load evaluation.");
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const grouped = useMemo(() => {
    const findings = report?.findings ?? [];
    return {
      summary: findings.filter((f) => f.type === "summary"),
      section_analysis: findings.filter((f) => f.type === "section_analysis"),
      strength: findings.filter((f) => f.type === "strength"),
      issue: findings.filter((f) => f.type === "issue"),
      missing: findings.filter((f) => f.type === "missing"),
      recommendation: findings.filter((f) => f.type === "recommendation"),
      improvement: findings.filter((f) => f.type === "improvement"),
    };
  }, [report]);

  if (error && !report) {
    return (
      <main className="container" style={{ padding: "4rem 0" }}>
        <div className="panel fade-up">
          <h1 className="display" style={{ marginTop: 0 }}>
            We couldn’t evaluate this CV
          </h1>
          <p style={{ color: "var(--muted)" }}>{error}</p>
          <Link className="btn btn-primary" href="/">
            Upload a different CV
          </Link>
        </div>
      </main>
    );
  }

  if (!report) {
    const label = STATUS_LABEL[status?.status || "uploaded"] || "Working…";
    return (
      <main className="container" style={{ padding: "4rem 0" }}>
        <div className="panel fade-up" aria-live="polite">
          <p style={{ margin: 0, color: "var(--muted)" }}>Evaluating</p>
          <h1 className="display" style={{ margin: "0.4rem 0 1rem", fontSize: "1.8rem" }}>
            {status?.original_filename || "Your CV"}
          </h1>
          <p style={{ fontWeight: 600 }}>{label}</p>
          <p style={{ color: "var(--muted)" }}>This usually takes under a minute.</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
            {["uploaded", "extracting", "evaluating"].map((step) => {
              const current = status?.status || "uploaded";
              const order = ["uploaded", "extracting", "evaluating", "completed"];
              const active = order.indexOf(current) >= order.indexOf(step);
              return (
                <span
                  key={step}
                  style={{
                    padding: "0.35rem 0.7rem",
                    borderRadius: 999,
                    border: "1px solid var(--line)",
                    background: active ? "rgba(26,79,122,0.1)" : "transparent",
                    fontSize: "0.85rem",
                    textTransform: "capitalize",
                  }}
                >
                  {step}
                </span>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  const scores = report.scores;
  const executive = grouped.summary[0];

  return (
    <main className="container" style={{ padding: "3rem 0 4rem" }}>
      <header className="fade-up" style={{ marginBottom: "1.5rem" }}>
        <p style={{ margin: 0, color: "var(--muted)" }}>CV Evaluation Report</p>
        <h1 className="display" style={{ margin: "0.35rem 0", fontSize: "clamp(1.8rem, 4vw, 2.4rem)" }}>
          {report.original_filename}
        </h1>
      </header>

      <section className="panel fade-up" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "var(--muted)", fontWeight: 600 }}>Overall score</div>
            <div className="display" style={{ fontSize: "3.4rem", lineHeight: 1, color: "var(--brand-deep)" }}>
              {scores.overall}
              <span style={{ fontSize: "1.2rem", color: "var(--muted)" }}>/100</span>
            </div>
            <div style={{ marginTop: "0.35rem", fontWeight: 600 }}>{scoreBand(scores.overall)}</div>
          </div>
          {report.processing_ms != null && (
            <div style={{ color: "var(--muted)" }}>Processed in {(report.processing_ms / 1000).toFixed(1)}s</div>
          )}
        </div>
      </section>

      {executive && (
        <section className="panel fade-up" style={{ marginBottom: "1.25rem" }}>
          <h2 className="display" style={{ margin: "0 0 0.75rem", fontSize: "1.35rem" }}>
            Executive summary
          </h2>
          <p style={{ margin: 0, lineHeight: 1.6, color: "var(--ink)", whiteSpace: "pre-wrap" }}>{executive.detail}</p>
        </section>
      )}

      <section className="panel fade-up-delay" style={{ marginBottom: "1.25rem" }}>
        <h2 className="display" style={{ margin: "0 0 1rem", fontSize: "1.35rem" }}>
          Category scores
        </h2>
        <ScoreRow label="ATS" value={scores.ats} />
        <ScoreRow label="Experience" value={scores.experience} />
        <ScoreRow label="Skills" value={scores.skills} />
        <ScoreRow label="Content" value={scores.content} />
        <ScoreRow label="Formatting" value={scores.formatting} />
      </section>

      {!!report.sections_detected?.length && (
        <section className="panel" style={{ marginBottom: "0.5rem" }}>
          <h2 className="display" style={{ margin: "0 0 0.75rem", fontSize: "1.2rem" }}>
            Sections detected
          </h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {report.sections_detected.map((s) => (
              <span
                key={s}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 999,
                  padding: "0.3rem 0.7rem",
                  fontSize: "0.9rem",
                }}
              >
                {s.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        </section>
      )}

      <FindingsGroup
        title="Section-by-section analysis"
        items={grouped.section_analysis}
        emptyHint="No section-level notes were returned for this CV."
      />
      <FindingsGroup title="Strengths" items={grouped.strength} />
      <FindingsGroup title="Issues" items={grouped.issue} />
      <FindingsGroup title="Missing information" items={grouped.missing} />
      <FindingsGroup title="Recommendations" items={grouped.recommendation} />
      <FindingsGroup
        title="Suggested improvements / rewrites"
        items={grouped.improvement}
        emptyHint="No rewrite examples were generated."
      />

      <div style={{ marginTop: "2rem" }}>
        <Link className="btn btn-primary" href="/">
          Evaluate another CV
        </Link>
      </div>
    </main>
  );
}
