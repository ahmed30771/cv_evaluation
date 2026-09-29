"""Deterministic checklist caps and overall recompute."""

from __future__ import annotations

import re
from typing import Any


WEIGHTS = {
    "ats": 0.20,
    "experience": 0.25,
    "skills": 0.20,
    "content": 0.20,
    "formatting": 0.15,
}


def clamp_score(value: Any) -> int:
    try:
        n = int(round(float(value)))
    except (TypeError, ValueError):
        n = 0
    return max(0, min(100, n))


def recompute_overall(scores: dict[str, int]) -> int:
    total = sum(WEIGHTS[k] * scores[k] for k in WEIGHTS)
    return clamp_score(total)


def checklist_signals(raw_text: str, sections: dict) -> dict[str, bool]:
    text = raw_text or ""
    email = bool(re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", text, re.I))
    phone = bool(re.search(r"(\+?\d[\d\s().-]{7,}\d)", text))
    experience_body = sections.get("experience") or []
    has_experience = bool(experience_body) or bool(
        re.search(r"\b(experience|employment)\b", text, re.I)
    )
    has_metrics = bool(re.search(r"\d", " ".join(_flatten(experience_body)))) or bool(
        re.search(r"\d+%|\b\d{2,}\b", text)
    )
    skills = sections.get("skills") or []
    has_skills = len(skills) >= 2 or bool(re.search(r"\bskills?\b", text, re.I))
    has_education = bool(sections.get("education")) or bool(
        re.search(r"\beducation\b", text, re.I)
    )
    return {
        "email": email,
        "phone": phone,
        "has_experience": has_experience,
        "has_metrics": has_metrics,
        "has_skills": has_skills,
        "has_education": has_education,
    }


def apply_checklist_caps(scores: dict[str, int], signals: dict[str, bool], injection_hit: bool) -> dict[str, int]:
    out = dict(scores)

    if not signals["has_experience"]:
        out["experience"] = min(out["experience"], 45)
    elif not signals["has_metrics"]:
        out["experience"] = min(out["experience"], 78)

    if not signals["has_skills"]:
        out["skills"] = min(out["skills"], 50)

    if not (signals["email"] or signals["phone"]):
        out["content"] = min(out["content"], 70)
        out["ats"] = min(out["ats"], 75)

    if not signals["has_education"]:
        out["content"] = min(out["content"], 80)

    # Implausible perfect scores with weak signals
    weak = not signals["has_experience"] or not signals["has_skills"]
    if weak and out["overall"] >= 90:
        for k in ("ats", "experience", "skills", "content", "formatting"):
            out[k] = min(out[k], 72)

    if injection_hit:
        # Soft penalty — do not reward gaming attempts
        for k in ("ats", "experience", "skills", "content", "formatting"):
            out[k] = min(out[k], 85)
        out["formatting"] = min(out["formatting"], 70)

    out["overall"] = recompute_overall(out)
    return out


def _flatten(items: Any) -> list[str]:
    if items is None:
        return []
    if isinstance(items, str):
        return [items]
    if isinstance(items, dict):
        return [str(v) for v in items.values()]
    if isinstance(items, list):
        out: list[str] = []
        for it in items:
            out.extend(_flatten(it))
        return out
    return [str(items)]
