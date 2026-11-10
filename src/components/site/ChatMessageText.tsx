import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-b-${i++}`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={`${keyPrefix}-i-${i++}`}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function isBullet(line: string) {
  return /^\s*([-•*]|\d+[.)])\s+/.test(line);
}

function stripBullet(line: string) {
  return line.replace(/^\s*([-•*]|\d+[.)])\s+/, "").trim();
}

/** Fix common model habit: "sentence. - bullet - bullet" on one line. */
function normalizeChatText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/([.!?…])\s+([-•*])\s+/g, "$1\n$2 ")
    .replace(/\s+([-•*])\s+(?=[A-Z0-9“"'])/g, "\n$1 ")
    .trim();
}

/** Lightweight markdown for chat bubbles: bold, italics, lists, paragraphs. */
export function ChatMessageText({ text }: { text: string }) {
  const normalized = normalizeChatText(text);
  if (!normalized) return null;

  const blocks = normalized.split(/\n{2,}/);
  const elements: ReactNode[] = [];

  blocks.forEach((block, bi) => {
    const lines = block.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
    if (!lines.length) return;

    const allBullets = lines.every(isBullet);
    if (allBullets) {
      elements.push(
        <ul key={`ul-${bi}`} className="bx-chat-list">
          {lines.map((line, li) => (
            <li key={`li-${bi}-${li}`}>{renderInline(stripBullet(line), `l${bi}-${li}`)}</li>
          ))}
        </ul>,
      );
      return;
    }

    // Mixed: render line-by-line, grouping consecutive bullets
    let i = 0;
    while (i < lines.length) {
      if (isBullet(lines[i]!)) {
        const items: string[] = [];
        while (i < lines.length && isBullet(lines[i]!)) {
          items.push(stripBullet(lines[i]!));
          i++;
        }
        elements.push(
          <ul key={`ul-${bi}-${i}`} className="bx-chat-list">
            {items.map((item, li) => (
              <li key={`mli-${bi}-${li}`}>{renderInline(item, `m${bi}-${li}`)}</li>
            ))}
          </ul>,
        );
      } else {
        const paraLines: string[] = [];
        while (i < lines.length && !isBullet(lines[i]!)) {
          paraLines.push(lines[i]!.trim());
          i++;
        }
        elements.push(
          <p key={`p-${bi}-${i}`} className="bx-chat-p">
            {paraLines.map((line, li) => (
              <span key={`pl-${bi}-${li}`}>
                {li > 0 ? <br /> : null}
                {renderInline(line, `p${bi}-${li}`)}
              </span>
            ))}
          </p>,
        );
      }
    }
  });

  return <div className="bx-chat-rich">{elements}</div>;
}
