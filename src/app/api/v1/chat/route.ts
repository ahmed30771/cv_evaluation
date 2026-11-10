import { NextResponse } from "next/server";
import { replyAsOfferquayGuide, type GuideChatMessage } from "@/server/guide-chat";

export const runtime = "nodejs";
export const maxDuration = 40;

type Body = {
  messages?: { role?: string; content?: string }[];
};

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { detail: "Server misconfigured: GROQ_API_KEY is missing." },
        { status: 500 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const raw = Array.isArray(body.messages) ? body.messages : [];
    const messages: GuideChatMessage[] = raw
      .map((m) => {
        const role = m.role === "assistant" || m.role === "bot" ? "assistant" : "user";
        const content = String(m.content || "").trim();
        return { role, content } as GuideChatMessage;
      })
      .filter((m) => m.content.length > 0)
      .slice(-12);

    if (!messages.length || messages[messages.length - 1]?.role !== "user") {
      return NextResponse.json({ detail: "Send at least one user message." }, { status: 400 });
    }

    const reply = await replyAsOfferquayGuide(messages);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("POST /api/v1/chat failed", err);
    const msg = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
