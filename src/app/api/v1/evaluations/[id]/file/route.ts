import { NextResponse } from "next/server";
import { getUploadBytes } from "@/server/uploads";

export const runtime = "nodejs";
export const maxDuration = 30;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const file = await getUploadBytes(id);
    if (!file) {
      return NextResponse.json(
        { detail: "Original file not found. Re-upload the CV to edit the PDF canvas." },
        { status: 404 },
      );
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.mime_type,
        "Content-Disposition": `inline; filename="${file.file_name.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load file";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
