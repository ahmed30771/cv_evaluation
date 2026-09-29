import { NextResponse } from "next/server";
import { runEvaluationFromUpload } from "@/server/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 5_242_880);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ detail: "Please choose a CV file." }, { status: 400 });
    }

    const name = file.name || "";
    const lower = name.toLowerCase();
    let fileType: "pdf" | "docx" | null = null;
    if (lower.endsWith(".pdf")) fileType = "pdf";
    if (lower.endsWith(".docx")) fileType = "docx";
    if (!fileType) {
      return NextResponse.json({ detail: "Only PDF and DOCX files are supported." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ detail: "File is empty." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ detail: "File must be 5 MB or smaller." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await runEvaluationFromUpload({
      filename: name,
      fileType,
      fileSize: file.size,
      buffer,
    });

    return NextResponse.json(
      {
        id: result.id,
        status: result.status,
        original_filename: result.original_filename,
        created_at: new Date().toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
