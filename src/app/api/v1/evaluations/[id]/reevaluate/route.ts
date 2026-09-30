import { NextResponse } from "next/server";
import { reevaluateFromDraft } from "@/server/reevaluate";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { detail: "Server misconfigured: DATABASE_URL is missing." },
        { status: 500 },
      );
    }
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { detail: "Server misconfigured: OPENROUTER_API_KEY is missing." },
        { status: 500 },
      );
    }

    const { id } = await ctx.params;
    let body: { sections?: unknown; overlays?: unknown; raw_text?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const result = await reevaluateFromDraft(id, body);
    return NextResponse.json({ id, status: "completed", overall: result.overall });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Re-evaluation failed";
    const status = /not found/i.test(msg) ? 404 : 500;
    return NextResponse.json({ detail: msg }, { status });
  }
}
