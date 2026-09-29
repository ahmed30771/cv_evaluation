import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="uploaded")
    original_filename: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str] = mapped_column(String(16), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    processing_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    injection_heuristic_hit: Mapped[bool] = mapped_column(default=False)

    extraction = relationship("CvExtraction", back_populates="evaluation", uselist=False, cascade="all, delete-orphan")
    scores = relationship("EvaluationScore", back_populates="evaluation", uselist=False, cascade="all, delete-orphan")
    findings = relationship("EvaluationFinding", back_populates="evaluation", cascade="all, delete-orphan")


class CvExtraction(Base):
    __tablename__ = "cv_extractions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evaluation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluations.id", ondelete="CASCADE"), unique=True)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    sections: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    evaluation = relationship("Evaluation", back_populates="extraction")


class EvaluationScore(Base):
    __tablename__ = "evaluation_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evaluation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluations.id", ondelete="CASCADE"), unique=True)
    overall: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    ats: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    experience: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    skills: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    content: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    formatting: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    evaluation = relationship("Evaluation", back_populates="scores")


class EvaluationFinding(Base):
    __tablename__ = "evaluation_findings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evaluation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluations.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    section: Mapped[str | None] = mapped_column(String(64), nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    detail: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str | None] = mapped_column(String(16), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    evaluation = relationship("Evaluation", back_populates="findings")
