"""End-to-end evaluation pipeline."""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import CvExtraction, Evaluation, EvaluationFinding, EvaluationScore
from app.services.extract import extract_text_from_file, parse_sections
from app.services.integrity import detect_injection, neutralize_injection_spans
from app.services.openrouter import evaluate_cv
from app.services.scoring import apply_checklist_caps, checklist_signals


def process_evaluation(db: Session, evaluation_id: uuid.UUID) -> None:
    evaluation = db.get(Evaluation, evaluation_id)
    if not evaluation:
        return

    started = time.perf_counter()
    try:
        evaluation.status = "extracting"
        db.commit()

        path = Path(evaluation.storage_path)
        raw_text = extract_text_from_file(path, evaluation.file_type)
        if not raw_text or len(raw_text.strip()) < 40:
            raise ValueError(
                "Could not extract enough text from this file. "
                "Use a text-based PDF or DOCX (scanned image-only PDFs are not supported in MVP)."
            )

        sections = parse_sections(raw_text)
        injection_hit = detect_injection(raw_text)
        evaluation.injection_heuristic_hit = injection_hit

        db.add(
            CvExtraction(
                evaluation_id=evaluation.id,
                raw_text=raw_text,
                sections=sections,
            )
        )
        db.commit()

        evaluation.status = "evaluating"
        db.commit()

        text_for_llm = neutralize_injection_spans(raw_text) if injection_hit else raw_text
        result = evaluate_cv(text_for_llm)
        signals = checklist_signals(raw_text, sections)
        scores = apply_checklist_caps(result["scores"], signals, injection_hit)
        findings = list(result["findings"])

        if injection_hit:
            findings.insert(
                0,
                {
                    "type": "issue",
                    "section": "overall",
                    "title": "Instruction-like text detected in CV",
                    "detail": (
                        "This CV contains text that looks like an attempt to instruct the AI "
                        "(for example asking for a perfect score). Scores are based on the "
                        "evaluation rubric only and ignore embedded commands."
                    ),
                    "severity": "high",
                    "sort_order": -1,
                },
            )

        db.add(
            EvaluationScore(
                evaluation_id=evaluation.id,
                overall=scores["overall"],
                ats=scores["ats"],
                experience=scores["experience"],
                skills=scores["skills"],
                content=scores["content"],
                formatting=scores["formatting"],
            )
        )
        for f in findings:
            db.add(
                EvaluationFinding(
                    evaluation_id=evaluation.id,
                    type=f["type"],
                    section=f.get("section"),
                    title=f["title"],
                    detail=f["detail"],
                    severity=f.get("severity"),
                    sort_order=int(f.get("sort_order") or 0),
                )
            )

        evaluation.status = "completed"
        evaluation.completed_at = datetime.now(timezone.utc)
        evaluation.processing_ms = int((time.perf_counter() - started) * 1000)
        evaluation.error_message = None
        db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        evaluation = db.get(Evaluation, evaluation_id)
        if evaluation:
            evaluation.status = "failed"
            evaluation.error_message = _safe_error(exc)
            evaluation.completed_at = datetime.now(timezone.utc)
            evaluation.processing_ms = int((time.perf_counter() - started) * 1000)
            db.commit()


def _safe_error(exc: Exception) -> str:
    msg = str(exc)
    if "OpenRouter" in msg or "401" in msg or "402" in msg or "429" in msg:
        return "AI evaluation service is temporarily unavailable. Please try again."
    if "extract" in msg.lower() or "text" in msg.lower():
        return msg[:300]
    return "Evaluation failed. Please try another file or try again later."
