from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class EvaluationCreated(BaseModel):
    id: UUID
    status: str
    original_filename: str
    created_at: datetime | None = None


class EvaluationStatus(BaseModel):
    id: UUID
    status: str
    original_filename: str
    created_at: datetime | None = None
    completed_at: datetime | None = None
    error_message: str | None = None
    processing_ms: int | None = None


class ScoresOut(BaseModel):
    overall: int
    ats: int
    experience: int
    skills: int
    content: int
    formatting: int


class FindingOut(BaseModel):
    type: str
    section: str | None = None
    title: str
    detail: str
    severity: str | None = None


class ReportOut(BaseModel):
    id: UUID
    status: str
    original_filename: str
    created_at: datetime | None = None
    completed_at: datetime | None = None
    processing_ms: int | None = None
    scores: ScoresOut
    findings: list[FindingOut] = Field(default_factory=list)
    sections_detected: list[str] = Field(default_factory=list)
