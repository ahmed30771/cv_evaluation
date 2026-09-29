from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


def _normalize_database_url(url: str) -> str:
    # Neon may include channel_binding which some drivers reject.
    cleaned = url.replace("&channel_binding=require", "").replace("?channel_binding=require&", "?")
    # Prefer psycopg (v3) SQLAlchemy dialect.
    if cleaned.startswith("postgresql://"):
        cleaned = cleaned.replace("postgresql://", "postgresql+psycopg://", 1)
    elif cleaned.startswith("postgres://"):
        cleaned = cleaned.replace("postgres://", "postgresql+psycopg://", 1)
    return cleaned


engine = create_engine(
    _normalize_database_url(settings.database_url),
    pool_pre_ping=True,
    connect_args={"connect_timeout": 15},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
