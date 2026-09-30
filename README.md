# Bluexech Resume

Build a resume with guided onboarding, templates, live editor, and PDF/DOCX export. Optionally score an existing CV with AI.

**Stack:** Next.js (App Router + API routes) · Neon PostgreSQL · OpenRouter  
**Deploy:** Single Vercel project

## Local setup

```bash
npm install
cp .env.example .env.local   # fill secrets
npm run dev
```

App: http://localhost:3000 · Health: `/api/health`

## Product flows

| Path | What it does |
|------|----------------|
| `/build` | Onboarding wizard → template gallery → editor |
| `/build/[id]` | Live edit + preview + PDF/DOCX |
| `/evaluate` | Upload CV for AI scores |
| `/evaluations/[id]` | Score report → open builder |

## Environment

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Neon connection string |
| `OPENROUTER_API_KEY` | Yes | OpenRouter key |
| `OPENROUTER_MODEL` | Yes | e.g. `google/gemma-4-26b-a4b-it:free` |
| `OPENROUTER_BASE_URL` | Yes | `https://openrouter.ai/api/v1` |
| `MAX_UPLOAD_BYTES` | No | Default `5242880` (5 MB) |

Do not set `NEXT_PUBLIC_API_BASE_URL`.

## Vercel

1. Import the repo (root directory empty).
2. Add the env vars above.
3. Deploy and open `/` + `/api/health`.

## Docs

[`docs/README.md`](docs/README.md)
