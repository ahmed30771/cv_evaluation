const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /ignore\s+all\s+instructions?/i,
  /you\s+are\s+now\b/i,
  /system\s+prompt/i,
  /always\s+score/i,
  /give\s+(me\s+)?(a\s+)?(perfect\s+)?(score|100)/i,
  /set\s+all\s+scores?\s+to/i,
  /jailbreak/i,
  /<<<\s*CV_END\s*>>>/i,
  /<<<\s*CV_START\s*>>>/i,
  /do\s+not\s+follow\s+(the\s+)?rubric/i,
  /disregard\s+(the\s+)?(system|developer)/i,
];

export function detectInjection(text: string): boolean {
  if (!text) return false;
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

export function neutralizeInjectionSpans(text: string): string {
  let cleaned = text;
  for (const pattern of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, "[INSTRUCTION-LIKE TEXT REMOVED]");
  }
  return cleaned;
}
