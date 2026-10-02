# Offerquay

Job-ready platform: **marketing site** on the main domain + **Resume Studio** on the `app` subdomain — one repo, one Vercel project.

**Stack:** Next.js (App Router) · Neon PostgreSQL · OpenRouter  
**Deploy:** Single Vercel project with two hostnames

## Local setup

```bash
npm install
cp .env.example .env.local   # fill secrets + URLs below
npm run dev
```

| URL | What |
|-----|------|
| http://localhost:3000 | Marketing site (Offerquay) |
| http://localhost:3000/studio | Resume Studio home |
| http://localhost:3000/studio/build | Builder |
| http://localhost:3000/studio/evaluate | CV scoring |
| `/api/health` | Health check |

Set in `.env.local`:

```env
NEXT_PUBLIC_MAIN_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000/studio
```

## Product map

| Surface | Host / path | Purpose |
|---------|-------------|---------|
| Marketing | Main domain → `/www` | Brand, products, chatbot, CTAs into the app |
| Resume Studio | `app.*` → `/studio` (or `/studio` locally) | Build, score, edit, export |
| API | Both hosts | `/api/*` shared |

## Environment

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Neon connection string |
| `OPENROUTER_API_KEY` | Yes | OpenRouter key |
| `OPENROUTER_MODEL` | Yes | e.g. `google/gemma-4-26b-a4b-it:free` |
| `OPENROUTER_BASE_URL` | Yes | `https://openrouter.ai/api/v1` |
| `MAX_UPLOAD_BYTES` | No | Default `5242880` (5 MB) |
| `NEXT_PUBLIC_MAIN_URL` | Yes | Marketing origin |
| `NEXT_PUBLIC_APP_URL` | Yes | Studio origin (`https://app…` or `…/studio`) |
| `APP_HOST` | Prod | e.g. `app.offerquay.com` (middleware detection) |

Do not set `NEXT_PUBLIC_API_BASE_URL`.

## Vercel (one project)

1. Import this repo (root directory empty / `.`).
2. Add env vars above (use production URLs).
3. **Domains** on the same project:
   - `offerquay.com` (and `www`) → marketing
   - `app.offerquay.com` → Resume Studio  
4. Deploy. Middleware rewrites by `Host` header — no second project.

## Docs

[`docs/README.md`](docs/README.md)
