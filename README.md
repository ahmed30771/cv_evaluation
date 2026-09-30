# CV Evaluation Platform

Upload a PDF/DOCX CV → extract text → AI score → report.

**Stack:** Next.js (App Router + API routes) · Neon PostgreSQL · OpenRouter  
**Deploy:** Single Vercel project (UI and API together)

## Local setup

```bash
npm install
cp .env.example .env.local   # fill secrets
npm run dev
```

App: http://localhost:3000 · Health: `/api/health`

## Environment

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Neon connection string |
| `OPENROUTER_API_KEY` | Yes | OpenRouter key |
| `OPENROUTER_MODEL` | Yes | e.g. `google/gemma-4-26b-a4b-it:free` |
| `OPENROUTER_BASE_URL` | Yes | `https://openrouter.ai/api/v1` |
| `MAX_UPLOAD_BYTES` | No | Default `5242880` (5 MB) |

Do not set `NEXT_PUBLIC_API_BASE_URL` — the app calls same-origin `/api/v1/...`.

## Vercel

1. Import the repo (root directory empty).
2. Add the env vars above for Production (and Preview if needed).
3. Deploy and open `/` + `/api/health`.

API routes use `maxDuration: 60` (Pro plan recommended for LLM latency).

## Docs

Product and tech docs: [`docs/README.md`](docs/README.md).
