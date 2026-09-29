"""Prompt-injection / score-gaming heuristics."""

from __future__ import annotations

import re

INJECTION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?", re.I),
    re.compile(r"ignore\s+all\s+instructions?", re.I),
    re.compile(r"you\s+are\s+now\b", re.I),
    re.compile(r"system\s+prompt", re.I),
    re.compile(r"always\s+score", re.I),
    re.compile(r"give\s+(me\s+)?(a\s+)?(perfect\s+)?(score|100)", re.I),
    re.compile(r"set\s+all\s+scores?\s+to", re.I),
    re.compile(r"jailbreak", re.I),
    re.compile(r"<<<\s*CV_END\s*>>>", re.I),
    re.compile(r"<<<\s*CV_START\s*>>>", re.I),
    re.compile(r"do\s+not\s+follow\s+(the\s+)?rubric", re.I),
    re.compile(r"disregard\s+(the\s+)?(system|developer)", re.I),
]


def detect_injection(text: str) -> bool:
    if not text:
        return False
    return any(p.search(text) for p in INJECTION_PATTERNS)


def neutralize_injection_spans(text: str) -> str:
    """Replace instruction-like spans so they are less likely to steer the model."""
    cleaned = text
    for pattern in INJECTION_PATTERNS:
        cleaned = pattern.sub("[INSTRUCTION-LIKE TEXT REMOVED]", cleaned)
    return cleaned
