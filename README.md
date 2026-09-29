# CV Evaluation Platform

AI-powered CV evaluation: upload PDF/DOCX → extract → score → report.

**Stack:** Next.js + FastAPI (same Vercel project) · Neon PostgreSQL · OpenRouter

## Local setup

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate   # Windows
pip install -r requirements.txt
# secrets in backend/.env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend (repo root)

```bash
npm install
# .env.local → NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
npm run dev
```

Open http://localhost:3000

## Deploy ONE project on Vercel

Same repo, **one** Vercel project — Next.js UI + Python API on the same domain.

1. Push latest code to GitHub  
2. [vercel.com/new](https://vercel.com/new) → import `cv_evaluation`  
3. **Root Directory:** leave **empty** / `.` (repo root) — do **not** set `frontend` or `backend`  
4. Framework: Next.js (auto)  
5. Add Environment Variables (Production):

| Name | Value |
|------|--------|
| `DATABASE_URL` | Neon URL |
| `OPENROUTER_API_KEY` | your key |
| `OPENROUTER_MODEL` | `google/gemma-4-31b-it:free` |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` |
| `CORS_ORIGINS` | `https://YOUR-APP.vercel.app` |
| `MAX_UPLOAD_BYTES` | `5242880` |

Do **not** set `NEXT_PUBLIC_API_BASE_URL` on Vercel (API is same origin: `/api/v1/...`).

6. Deploy  
7. Test: `https://YOUR-APP.vercel.app/health` and the site home page  

### How it works

- Next.js serves pages from repo root  
- FastAPI is exposed via [`api/index.py`](api/index.py) (Vercel Python serverless)  
- Upload runs evaluation **synchronously** (needed on serverless)  
- `maxDuration: 60` in [`vercel.json`](vercel.json) — **Pro** plan recommended for LLM time  

### Security

Never commit `.env` / `.env.local`. Rotate keys if they were exposed.

## Docs

See [`docs/README.md`](docs/README.md).
