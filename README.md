# CV Evaluation Platform

AI-powered CV evaluation: upload PDF/DOCX → extract → score → report.

**Stack:** Next.js (UI + API routes) · Neon PostgreSQL · OpenRouter  
**Deploy:** One Vercel project

## Why you saw Request failed (404)

Python FastAPI under `/api` does **not** run inside a Next.js Vercel project.  
API now lives in Next.js Route Handlers: `/api/v1/evaluations`.

## Local setup

```bash
npm install
# copy .env.example → .env.local and fill secrets
npm run dev
```

Open http://localhost:3000  
Health: http://localhost:3000/api/health

Optional: `backend/` FastAPI still exists for local Python experiments, but the product path is Next.js API.

## Deploy on Vercel (1 project)

1. Push to GitHub  
2. Import repo on Vercel — **Root Directory empty**  
3. Add env vars (Production + Preview):

| Name | Example |
|------|---------|
| `DATABASE_URL` | Neon URL |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` |
| `OPENROUTER_MODEL` | `google/gemma-4-31b-it:free` |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` |
| `MAX_UPLOAD_BYTES` | `5242880` |

Do **not** set `NEXT_PUBLIC_API_BASE_URL`.

4. Deploy → test `/` and `/api/health`  
5. Upload a CV again

`maxDuration: 60` is set for API routes (Pro recommended for LLM time).

## Docs

See [`docs/README.md`](docs/README.md).
