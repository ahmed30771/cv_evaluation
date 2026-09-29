# CV Evaluation Platform

AI-powered CV evaluation: upload PDF/DOCX → extract → score → report.

**Stack:** Next.js (frontend) · FastAPI (backend) · Neon PostgreSQL · OpenRouter

## Local setup

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
pip install -r requirements.txt
# Copy secrets into backend/.env (see .env.example)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check: http://127.0.0.1:8000/health

### 2. Frontend

```bash
cd frontend
npm install
# Set NEXT_PUBLIC_API_BASE_URL in .env.local
npm run dev
```

Open http://localhost:3000

## Deploy (Vercel + API host)

Vercel hosts the **Next.js frontend**. The FastAPI backend needs a Python host with longer timeouts (LLM evaluation can take up to ~60s). Recommended: **Railway**, **Render**, or **Fly.io**.

### Frontend → Vercel

1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Set **Root Directory** to `frontend`.
4. Add env var:
   - `NEXT_PUBLIC_API_BASE_URL` = your public API URL (e.g. `https://cv-api.up.railway.app`)
5. Deploy.

### Backend → Railway / Render

1. Deploy from `backend/` (Dockerfile included).
2. Set env vars from `backend/.env.example`:
   - `DATABASE_URL` (Neon)
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL`
   - `OPENROUTER_BASE_URL`
   - `CORS_ORIGINS` = your Vercel domain (and `https://*.vercel.app` is also allowed via regex)
3. Expose port `8000` (or the platform `$PORT`).

### Important security note

Never commit `.env` files. If API keys were shared in chat, **rotate** the OpenRouter key and Neon password.

## Docs

See [`docs/README.md`](docs/README.md).
