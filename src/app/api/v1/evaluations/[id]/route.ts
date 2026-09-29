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
    const rows = await sql`
      SELECT id, status, original_filename, created_at, completed_at, error_message, processing_ms
      FROM evaluations
      WHERE id = ${id}
      LIMIT 1
    `;
    if (!rows.length) {
      return NextResponse.json({ detail: "Evaluation not found." }, { status: 404 });
    }
    const row = rows[0];
    return NextResponse.json({
      id: row.id,
      status: row.status,
      original_filename: row.original_filename,
      created_at: row.created_at,
      completed_at: row.completed_at,
      error_message: row.error_message,
      processing_ms: row.processing_ms,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load evaluation";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
