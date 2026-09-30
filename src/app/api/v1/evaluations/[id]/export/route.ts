import { NextResponse } from "next/server";
import { isTemplateId } from "@/lib/cv-types";
import { getRewrite, saveRewrite } from "@/server/rewrite";
import { buildDocx } from "@/server/export/docx";
import { buildPdf } from "@/server/export/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "pdf").toLowerCase();
    const templateParam = url.searchParams.get("template");

    if (format !== "pdf" && format !== "docx") {
      return NextResponse.json({ detail: "format must be pdf or docx" }, { status: 400 });
    }

    const row = await getRewrite(id);
    if (!row) {
      return NextResponse.json({ detail: "Rewrite not found. Generate a resume first." }, { status: 404 });
    }

    const templateId = isTemplateId(templateParam) ? templateParam : row.template_id;
    if (templateId !== row.template_id) {
      await saveRewrite(id, row.content, templateId);
    }

    const filenameBase = (row.content.personal.fullName || "resume")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 60) || "resume";

    if (format === "docx") {
      const buf = await buildDocx(row.content, templateId);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filenameBase}.docx"`,
        },
      });
    }

    const buf = await buildPdf(row.content, templateId);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
