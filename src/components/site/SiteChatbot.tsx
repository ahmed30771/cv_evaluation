"use client";

import { useEffect, useRef, useState } from "react";
import { appHref } from "@/lib/site";

type Msg = { role: "bot" | "user"; text: string };

const REPLIES: { match: RegExp; reply: string }[] = [
  {
    match: /resume|cv|score|ats|template|build/i,
    reply:
      "Resume Studio is live on the app. You can build from scratch, upload a CV for AI scoring, edit in a live preview, then export PDF/DOCX.",
  },
  {
    match: /interview|prep|mock/i,
    reply:
      "Interview Prep is on our roadmap — practice questions, feedback, and role-specific drills. Want a heads-up when it launches? Say “notify me”.",
  },
  {
    match: /notify|waitlist|launch/i,
    reply: "Noted! Keep an eye on Offerquay — Interview Prep and Career Coach will land here. Meanwhile, start with Resume Studio.",
  },
  {
    match: /price|cost|free|paid/i,
    reply: "Resume Studio scoring and building are available in the app today. Pricing for future premium tools will be announced with those launches.",
  },
  {
    match: /hello|hi|hey|salam/i,
    reply: "Hey — I’m the Offerquay guide. Ask about Resume Studio, upcoming Interview Prep, or how to get started.",
  },
];

function botReply(input: string): string {
  for (const row of REPLIES) {
    if (row.match.test(input)) return row.reply;
  }
  return "I can help with Resume Studio (live now), Interview Prep (soon), or how Offerquay gets you job-ready. What do you want to know?";
}

export function SiteChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "bot",
      text: "Hi — Offerquay helps you get job-ready. Resume Studio is live; Interview Prep is next. Ask me anything.",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  function send(text?: string) {
    const value = (text ?? input).trim();
    if (!value) return;
    setMsgs((m) => [...m, { role: "user", text: value }, { role: "bot", text: botReply(value) }]);
    setInput("");
  }

  return (
    <div className={`bx-chat ${open ? "is-open" : ""}`}>
      {open && (
        <div className="bx-chat-panel" role="dialog" aria-label="Offerquay assistant">
          <header className="bx-chat-head">
            <div>
              <strong>Offerquay guide</strong>
              <span>Usually replies instantly</span>
            </div>
            <button type="button" className="bx-chat-x" onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </header>
          <div className="bx-chat-body">
            {msgs.map((m, i) => (
              <div key={i} className={`bx-chat-bubble bx-chat-bubble--${m.role}`}>
                {m.text}
              </div>
            ))}
            <div className="bx-chat-quick">
              <button type="button" onClick={() => send("Tell me about Resume Studio")}>
                Resume Studio
              </button>
              <button type="button" onClick={() => send("When is Interview Prep?")}>
                Interview Prep
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
              send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Offerquay…"
              aria-label="Message"
            />
            <button type="submit">Send</button>
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
