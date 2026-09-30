import { NextResponse } from "next/server";
import { getOrCreateDraft, saveDraft } from "@/server/draft";

export const runtime = "nodejs";
export const maxDuration = 30;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const draft = await getOrCreateDraft(id);
    return NextResponse.json(draft);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load draft";
    const status = /not found/i.test(msg) ? 404 : 500;
    return NextResponse.json({ detail: msg }, { status });
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as { sections?: unknown; overlays?: unknown };
    if (!body?.sections || typeof body.sections !== "object") {
      return NextResponse.json({ detail: "sections object is required" }, { status: 400 });
    }
    const saved = await saveDraft(id, body.sections, body.overlays);
    return NextResponse.json({
      evaluation_id: id,
      ...saved,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save draft";
    const status = /not found/i.test(msg) ? 404 : 500;
    return NextResponse.json({ detail: msg }, { status });
  }
}
