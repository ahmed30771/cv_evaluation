"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getEvaluation, getReport, type EvaluationStatus, type Finding, type Report } from "@/lib/api";
import { studioPath } from "@/lib/site";

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
    <div className="sq-score-row">
      <div className="sq-score-row-head">
        <span>{label}</span>
        <span>
          {value}/100 <em>({scoreBand(value)})</em>
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
    <section>
      <h3 className="sq-findings-title">
        {title}
        <span>({items.length})</span>
      </h3>
      <div className="sq-surface">
        {!items.length && <p style={{ margin: 0, color: "var(--muted)" }}>{emptyHint || "Nothing flagged in this category."}</p>}
        {items.map((f, idx) => (
          <article key={`${f.type}-${idx}`} className={`finding ${f.type === "section_analysis" ? "recommendation" : f.type}`}>
            <div className="sq-finding-meta">
              <span>{f.type.replace("_", " ")}</span>
              {f.section && <span className="sq-finding-tag">{f.section}</span>}
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
      <main className="sq-page">
        <div className="sq-surface sq-rise">
          <h1 className="sq-title">We couldn’t evaluate this CV</h1>
          <p className="sq-lead">{error}</p>
          <Link className="btn btn-primary" href={studioPath("/evaluate")}>
            Upload a different CV
          </Link>
        </div>
      </main>
    );
  }

  if (!report) {
    const label = STATUS_LABEL[status?.status || "uploaded"] || "Working…";
    return (
      <main className="sq-page">
        <div className="sq-surface sq-rise" aria-live="polite">
          <p className="sq-kicker">Evaluating</p>
          <h1 className="sq-title" style={{ fontSize: "1.8rem" }}>
            {status?.original_filename || "Your CV"}
          </h1>
          <p style={{ fontWeight: 650, margin: "0 0 0.35rem" }}>{label}</p>
          <p className="sq-lead" style={{ marginBottom: "1.1rem" }}>
            This usually takes under a minute.
          </p>
          <div className="sq-chip-row">
            {["uploaded", "extracting", "evaluating"].map((step) => {
              const current = status?.status || "uploaded";
              const order = ["uploaded", "extracting", "evaluating", "completed"];
              const active = order.indexOf(current) >= order.indexOf(step);
              return (
                <span key={step} className={`sq-chip ${active ? "is-on" : ""}`}>
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
    <main className="sq-page">
      <header className="sq-rise" style={{ marginBottom: "1.5rem" }}>
        <p className="sq-kicker">CV evaluation report</p>
        <h1 className="sq-title">{report.original_filename}</h1>
      </header>

      <section className="sq-surface sq-rise" style={{ marginBottom: "1.1rem" }}>
        <div className="sq-score-hero">
          <div>
            <div style={{ color: "var(--muted)", fontWeight: 600 }}>Overall score</div>
            <div className="sq-score-value">
              {scores.overall}
              <span>/100</span>
            </div>
            <div className="sq-score-band">{scoreBand(scores.overall)}</div>
          </div>
          {report.processing_ms != null && (
            <div style={{ color: "var(--muted)" }}>Processed in {(report.processing_ms / 1000).toFixed(1)}s</div>
          )}
        </div>
      </section>

      {executive && (
        <section className="sq-surface sq-rise" style={{ marginBottom: "1.1rem" }}>
          <h2 className="sq-findings-title" style={{ marginTop: 0 }}>
            Executive summary
          </h2>
          <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{executive.detail}</p>
        </section>
      )}

      <section className="sq-surface sq-rise-delay" style={{ marginBottom: "1.1rem" }}>
        <h2 className="sq-findings-title" style={{ marginTop: 0 }}>
          Category scores
        </h2>
        <ScoreRow label="ATS" value={scores.ats} />
        <ScoreRow label="Experience" value={scores.experience} />
        <ScoreRow label="Skills" value={scores.skills} />
        <ScoreRow label="Content" value={scores.content} />
        <ScoreRow label="Formatting" value={scores.formatting} />
      </section>

      {!!report.sections_detected?.length && (
        <section className="sq-surface" style={{ marginBottom: "0.5rem" }}>
          <h2 className="sq-findings-title" style={{ marginTop: 0, fontSize: "1.15rem" }}>
            Sections detected
          </h2>
          <div className="sq-chip-row">
            {report.sections_detected.map((s) => (
              <span key={s} className="sq-chip">
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

      <div className="sq-actions" style={{ marginTop: "2rem" }}>
        <Link className="btn btn-primary" href={studioPath(`/build/${id}`)}>
          Fix my CV / Open builder
        </Link>
        <Link className="btn btn-ghost" href={studioPath("/")}>
          Studio home
        </Link>
        <Link className="btn btn-ghost" href={studioPath("/evaluate")}>
          Evaluate another
        </Link>
      </div>
    </main>
  );
}
