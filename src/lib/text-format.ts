/** Shared helpers for contenteditable CV field formatting. */

type SavedSelection = {
  field: HTMLElement;
  range: Range;
};

let saved: SavedSelection | null = null;
let listening = false;

function isEditField(node: Node | null): HTMLElement | null {
  if (!node) return null;
  const el = node instanceof HTMLElement ? node : node.parentElement;
  return el?.closest(".cv-edit-field") as HTMLElement | null;
}

export function startFormatSelectionTracking() {
  if (listening || typeof document === "undefined") return;
  listening = true;
  document.addEventListener("selectionchange", () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const field = isEditField(sel.anchorNode);
    if (!field) return;
    try {
      saved = { field, range: sel.getRangeAt(0).cloneRange() };
      (window as unknown as { __cvLastEditField?: HTMLElement }).__cvLastEditField = field;
    } catch {
      /* ignore */
    }
  });
}

export function rememberEditSelection(field?: HTMLElement | null) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const el = field || isEditField(sel.anchorNode);
  if (!el) return;
  if (!el.contains(sel.anchorNode) && sel.anchorNode !== el) return;
  try {
    saved = { field: el, range: sel.getRangeAt(0).cloneRange() };
    (window as unknown as { __cvLastEditField?: HTMLElement }).__cvLastEditField = el;
  } catch {
    /* ignore */
  }
}

export function restoreEditSelection(): boolean {
  if (!saved || !document.contains(saved.field)) return false;
  try {
    saved.field.focus({ preventScroll: true });
    const sel = window.getSelection();
    if (!sel) return false;
    // Re-clone in case DOM shifted slightly
    const range = saved.range.cloneRange();
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  } catch {
    return false;
  }
}

export function focusActiveEditField(root?: ParentNode | null): HTMLElement | null {
  if (restoreEditSelection()) return saved?.field || null;
  const scope = root || document;
  const focused = scope.querySelector(".cv-edit-field:focus") as HTMLElement | null;
  if (focused) return focused;
  const last = (window as unknown as { __cvLastEditField?: HTMLElement }).__cvLastEditField;
  if (last && document.contains(last)) {
    last.focus({ preventScroll: true });
    return last;
  }
  return null;
}

function afterMutate() {
  rememberEditSelection();
  const field = saved?.field;
  if (!field) return;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new CustomEvent("cv-format-applied", { bubbles: true }));
}

export function runExecCommand(cmd: string, value?: string): boolean {
  startFormatSelectionTracking();
  const field = focusActiveEditField();
  if (!field) return false;
  try {
    const ok = document.execCommand(cmd, false, value);
    afterMutate();
    return ok;
  } catch {
    return false;
  }
}

export function replaceSelectionText(next: string): boolean {
  startFormatSelectionTracking();
  if (!focusActiveEditField()) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(next);
  range.insertNode(node);
  range.setStart(node, 0);
  range.setEnd(node, node.data.length);
  sel.removeAllRanges();
  sel.addRange(range);
  afterMutate();
  return true;
}

export type TextCaseMode = "upper" | "lower" | "title" | "sentence";

export function transformSelectedCase(mode: TextCaseMode): boolean {
  startFormatSelectionTracking();
  if (!focusActiveEditField()) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const text = sel.toString();
  if (!text) return false;
  let next = text;
  if (mode === "upper") next = text.toUpperCase();
  if (mode === "lower") next = text.toLowerCase();
  if (mode === "title") {
    next = text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
  if (mode === "sentence") {
    next = text.toLowerCase().replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (m) => m.toUpperCase());
  }
  return replaceSelectionText(next);
}

/** Toggle • bullets on selected lines. */
export function toggleBulletSelection(): boolean {
  startFormatSelectionTracking();
  if (!focusActiveEditField()) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const text = sel.toString();
  if (!text) return false;
  const lines = text.split(/\n/);
  const contentLines = lines.filter((line) => line.trim());
  const allBulleted =
    contentLines.length > 0 &&
    contentLines.every((line) => /^[-•*]\s+/.test(line.trim()) || /^[-•*]$/.test(line.trim()));
  const next = lines
    .map((line) => {
      if (!line.trim()) return line;
      if (allBulleted) return line.replace(/^\s*[-•*]\s*/, "");
      const t = line.replace(/^\s*[-•*]\s*/, "").trim();
      return t ? `• ${t}` : line;
    })
    .join("\n");
  return replaceSelectionText(next);
}

/** Toggle 1. 2. 3. numbered lines. */
export function toggleNumberedSelection(): boolean {
  startFormatSelectionTracking();
  if (!focusActiveEditField()) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const text = sel.toString();
  if (!text) return false;
  const lines = text.split(/\n/);
  const contentLines = lines.filter((line) => line.trim());
  const allNumbered =
    contentLines.length > 0 && contentLines.every((line) => /^\d+[.)]\s+/.test(line.trim()));
  let n = 1;
  const next = lines
    .map((line) => {
      if (!line.trim()) return line;
      if (allNumbered) return line.replace(/^\s*\d+[.)]\s*/, "");
      const t = line.replace(/^\s*(?:\d+[.)]|[-•*])\s*/, "").trim();
      return t ? `${n++}. ${t}` : line;
    })
    .join("\n");
  return replaceSelectionText(next);
}

export function indentSelection(outdent = false): boolean {
  startFormatSelectionTracking();
  if (!focusActiveEditField()) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const text = sel.toString();
  if (!text) return false;
  const next = text
    .split(/\n/)
    .map((line) => {
      if (outdent) return line.replace(/^( {2}|\t)/, "");
      if (!line.trim()) return line;
      return `  ${line}`;
    })
    .join("\n");
  return replaceSelectionText(next);
}

/** Persistable snapshot of a contenteditable field (HTML when styled, else plain). */
export function serializeEditField(el: HTMLElement): string {
  const html = el.innerHTML.replace(/\u00a0/g, " ").trim();
  // plain text only
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return (el.innerText || el.textContent || "").replace(/\u00a0/g, " ").trimEnd();
  }
  return html;
}

export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

export function stripHtml(value: string): string {
  if (!looksLikeHtml(value)) return value;
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
