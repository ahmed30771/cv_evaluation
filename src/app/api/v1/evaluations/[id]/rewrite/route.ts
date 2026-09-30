import { NextResponse } from "next/server";
import { generateRewrite, getRewrite, updateRewrite } from "@/server/rewrite";
import { TEMPLATES } from "@/lib/templates";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const row = await getRewrite(id);
    if (!row) {
      return NextResponse.json({ detail: "Rewrite not found" }, { status: 404 });
    }
    return NextResponse.json({ ...row, templates: TEMPLATES });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load rewrite";
    const status = /not found/i.test(msg) ? 404 : 500;
    return NextResponse.json({ detail: msg }, { status });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const row = await generateRewrite(id, {
      content: body?.content,
    });
    return NextResponse.json({ ...row, templates: TEMPLATES });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to generate rewrite";
    let status = 500;
    if (/not found/i.test(msg)) status = 404;
    else if (/must be completed/i.test(msg)) status = 400;
    return NextResponse.json({ detail: msg }, { status });
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const row = await updateRewrite(id, {
      content: body?.content,
      template_id: body?.template_id,
      meta: body?.meta,
    });
    return NextResponse.json({ ...row, templates: TEMPLATES });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update rewrite";
    let status = 500;
    if (/not found|Generate one first/i.test(msg)) status = 404;
    else if (/must be completed/i.test(msg)) status = 400;
    return NextResponse.json({ detail: msg }, { status });
  }
}
