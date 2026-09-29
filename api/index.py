"""Vercel Python entry — serves FastAPI on the same project as Next.js."""

from __future__ import annotations

import sys
from pathlib import Path

# Allow importing the FastAPI package from /backend
ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.main import app  # noqa: E402,F401
