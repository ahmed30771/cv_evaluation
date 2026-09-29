import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/server/db";

export const runtime = "nodejs";
export const maxDuration = 30;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    await ensureSchema();
    const sql = getSql();

    const evaluations = await sql`
      SELECT id, status, original_filename, created_at, completed_at, processing_ms
      FROM evaluations
      WHERE id = ${id}
      LIMIT 1
    `;
    if (!evaluations.length) {
      return NextResponse.json({ detail: "Evaluation not found." }, { status: 404 });
    }
    const evaluation = evaluations[0];
    if (evaluation.status !== "completed") {
      return NextResponse.json({ detail: "Report is not ready yet." }, { status: 409 });
    }

    const scoresRows = await sql`
      SELECT overall, ats, experience, skills, content, formatting
      FROM evaluation_scores
      WHERE evaluation_id = ${id}
      LIMIT 1
    `;
    if (!scoresRows.length) {
      return NextResponse.json({ detail: "Report is not ready yet." }, { status: 409 });
    }

    const findings = await sql`
      SELECT type, section, title, detail, severity
      FROM evaluation_findings
      WHERE evaluation_id = ${id}
      ORDER BY sort_order ASC, type ASC
    `;

    const extractions = await sql`
      SELECT sections
      FROM cv_extractions
      WHERE evaluation_id = ${id}
      LIMIT 1
    `;
    const sections = (extractions[0]?.sections as Record<string, unknown>) || {};
    const sectionsDetected = Object.entries(sections)
      .filter(([, value]) => {
        if (value == null || value === "") return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
          return false;
        }
        return true;
      })
      .map(([key]) => key);

    return NextResponse.json({
      id: evaluation.id,
      status: evaluation.status,
      original_filename: evaluation.original_filename,
      created_at: evaluation.created_at,
      completed_at: evaluation.completed_at,
      processing_ms: evaluation.processing_ms,
      scores: scoresRows[0],
      findings,
      sections_detected: sectionsDetected,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load report";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
