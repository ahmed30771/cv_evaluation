"""API routes for evaluations."""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.models import Evaluation
from app.schemas import EvaluationCreated, EvaluationStatus, FindingOut, ReportOut, ScoresOut
from app.services.pipeline import process_evaluation

router = APIRouter(tags=["evaluations"])

ALLOWED_EXT = {
    ".pdf": "pdf",
    ".docx": "docx",
}
ALLOWED_MIME = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",  # browsers sometimes send this
}


@router.post("/evaluations", response_model=EvaluationCreated, status_code=status.HTTP_201_CREATED)
async def create_evaluation(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Please choose a CV file.")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="File is empty.")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail="File must be 5 MB or smaller.")

    file_type = ALLOWED_EXT[ext]
    evaluation_id = uuid.uuid4()
    upload_root = Path(settings.effective_upload_dir)
    upload_root.mkdir(parents=True, exist_ok=True)
    dest = upload_root / f"{evaluation_id}{ext}"
    dest.write_bytes(data)

    evaluation = Evaluation(
        id=evaluation_id,
        status="uploaded",
        original_filename=file.filename,
        file_type=file_type,
        file_size=len(data),
        storage_path=str(dest),
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)

    # Sync processing — required on Vercel serverless (no reliable background workers)
    process_evaluation(db, evaluation_id)
    db.refresh(evaluation)

    return EvaluationCreated(
        id=evaluation.id,
        status=evaluation.status,
        original_filename=evaluation.original_filename,
        created_at=evaluation.created_at,
    )


@router.get("/evaluations/{evaluation_id}", response_model=EvaluationStatus)
def get_evaluation(evaluation_id: uuid.UUID, db: Session = Depends(get_db)):
    evaluation = db.get(Evaluation, evaluation_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found.")
    return EvaluationStatus(
        id=evaluation.id,
        status=evaluation.status,
        original_filename=evaluation.original_filename,
        created_at=evaluation.created_at,
        completed_at=evaluation.completed_at,
        error_message=evaluation.error_message,
        processing_ms=evaluation.processing_ms,
    )


@router.get("/evaluations/{evaluation_id}/report", response_model=ReportOut)
def get_report(evaluation_id: uuid.UUID, db: Session = Depends(get_db)):
    evaluation = (
        db.query(Evaluation)
        .options(
            joinedload(Evaluation.scores),
            joinedload(Evaluation.findings),
            joinedload(Evaluation.extraction),
        )
        .filter(Evaluation.id == evaluation_id)
        .first()
    )
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found.")
    if evaluation.status != "completed":
        raise HTTPException(status_code=409, detail="Report is not ready yet.")
    if not evaluation.scores:
        raise HTTPException(status_code=409, detail="Report is not ready yet.")

    sections = (evaluation.extraction.sections if evaluation.extraction else {}) or {}
    sections_detected = [
        key
        for key, value in sections.items()
        if value not in (None, "", [], {})
    ]

    findings_sorted = sorted(evaluation.findings, key=lambda f: (f.sort_order, f.type))
    return ReportOut(
        id=evaluation.id,
        status=evaluation.status,
        original_filename=evaluation.original_filename,
        created_at=evaluation.created_at,
        completed_at=evaluation.completed_at,
        processing_ms=evaluation.processing_ms,
        scores=ScoresOut(
            overall=evaluation.scores.overall,
            ats=evaluation.scores.ats,
            experience=evaluation.scores.experience,
            skills=evaluation.scores.skills,
            content=evaluation.scores.content,
            formatting=evaluation.scores.formatting,
        ),
        findings=[
            FindingOut(
                type=f.type,
                section=f.section,
                title=f.title,
                detail=f.detail,
                severity=f.severity,
            )
            for f in findings_sorted
        ],
        sections_detected=sections_detected,
    )
