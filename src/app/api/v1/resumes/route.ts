import { NextResponse } from "next/server";
import { isTemplateId } from "@/lib/cv-types";
import { createBlankResume } from "@/server/resumes";
import { TEMPLATES } from "@/lib/templates";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const templateId = isTemplateId(body?.template_id) ? body.template_id : undefined;
    const preference = body?.preference === "visual" ? "visual" : "ats";
    const targetRole = typeof body?.target_role === "string" ? body.target_role.slice(0, 120) : "";

    const defaultTemplate =
      templateId || (preference === "visual" ? "sidebar" : "classic");

    const row = await createBlankResume({
      template_id: defaultTemplate,
      meta: { target_role: targetRole, preference, source: "blank" },
    });

    return NextResponse.json({
      id: row.evaluation_id,
      ...row,
      templates: TEMPLATES,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create resume";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
