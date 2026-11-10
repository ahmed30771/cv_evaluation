"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessageText } from "@/components/site/ChatMessageText";
import { appHref } from "@/lib/site";

type Msg = { role: "bot" | "user"; text: string };

const WELCOME =
  "Hi — I’m the Offerquay AI guide. I can walk you through Resume Studio (score, build, edit, export) and what’s coming next. What do you want to do?";

async function askGuide(history: Msg[]): Promise<string> {
  const res = await fetch("/api/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: history.map((m) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.text,
      })),
    }),
  });
  if (!res.ok) {
    let detail = "Could not reach the guide.";
    try {
      const data = (await res.json()) as { detail?: string };
      if (data.detail) detail = data.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  const data = (await res.json()) as { reply?: string };
  return (data.reply || "").trim() || "Tell me what you want to do in Resume Studio and I’ll guide you.";
}

export function SiteChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: WELCOME }]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open, busy]);

  async function send(text?: string) {
    const value = (text ?? input).trim();
    if (!value || busy) return;

    const nextMsgs: Msg[] = [...msgs, { role: "user", text: value }];
    setMsgs(nextMsgs);
    setInput("");
    setBusy(true);

    try {
      const reply = await askGuide(nextMsgs);
      setMsgs((m) => [...m, { role: "bot", text: reply }]);
    } catch (err) {
      const fallback =
        err instanceof Error && err.message
          ? err.message
          : "I couldn’t answer just now. Try again, or open Resume Studio.";
      setMsgs((m) => [...m, { role: "bot", text: fallback }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`bx-chat ${open ? "is-open" : ""}`}>
      {open && (
        <div className="bx-chat-panel" role="dialog" aria-label="Offerquay AI guide">
          <header className="bx-chat-head">
            <div>
              <strong>Offerquay AI guide</strong>
              <span>{busy ? "Thinking…" : "Ask anything about the product"}</span>
            </div>
            <button type="button" className="bx-chat-x" onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </header>
          <div className="bx-chat-body">
            {msgs.map((m, i) => (
              <div key={i} className={`bx-chat-bubble bx-chat-bubble--${m.role}`}>
                {m.role === "bot" ? <ChatMessageText text={m.text} /> : m.text}
              </div>
            ))}
            {busy && (
              <div className="bx-chat-bubble bx-chat-bubble--bot bx-chat-typing" aria-live="polite">
                <span />
                <span />
                <span />
              </div>
            )}
            <div className="bx-chat-quick">
              <button type="button" disabled={busy} onClick={() => void send("How do I score my CV?")}>
                Score my CV
              </button>
              <button type="button" disabled={busy} onClick={() => void send("How do I build a resume from scratch?")}>
                Build resume
              </button>
              <button type="button" disabled={busy} onClick={() => void send("What is coming next on Offerquay?")}>
                What’s next
              </button>
              <a className="bx-chat-go" href={appHref("/")}>
                Open app →
              </a>
            </div>
            <div ref={endRef} />
          </div>
          <form
            className="bx-chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask how to get started…"
              aria-label="Message"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        className="bx-chat-fab"
        aria-expanded={open}
        aria-label={open ? "Close chat" : "Open chat"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close" : "Chat"}
      </button>
    </div>
  );
}
