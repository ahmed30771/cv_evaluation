import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/server/db";
import { improveCvText } from "@/server/openrouter";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { detail: "Server misconfigured: OPENROUTER_API_KEY is missing." },
        { status: 500 },
      );
    }

    const { id } = await ctx.params;
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`SELECT id FROM evaluations WHERE id = ${id} LIMIT 1`;
    if (!rows[0]) {
      return NextResponse.json({ detail: "Evaluation not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      section?: string | null;
      text?: string;
      instruction?: string | null;
      finding_title?: string | null;
      finding_detail?: string | null;
    };

    const text = typeof body.text === "string" ? body.text : "";
    if (!text.trim()) {
      return NextResponse.json({ detail: "text is required" }, { status: 400 });
    }

    const improved = await improveCvText({
      section: body.section ?? null,
      text,
      instruction: body.instruction ?? null,
      findingTitle: body.finding_title ?? null,
      findingDetail: body.finding_detail ?? null,
    });

    return NextResponse.json({ improved });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Improve failed";
    const status = /not found/i.test(msg) ? 404 : 500;
    return NextResponse.json({ detail: msg }, { status });
  }
}
