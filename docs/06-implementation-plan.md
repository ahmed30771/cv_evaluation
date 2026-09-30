# Implementation Plan

**Product:** CV Evaluation Platform  
**Version:** 1.1 (MVP)  
**Stack:** Next.js (UI + API) · Neon PostgreSQL · OpenRouter

This plan sequences delivery for the MVP priority path: **Upload CV → Extract Text → AI Evaluation → Score → Detailed Report**. History, JD matching, and admin are Phase 2 only.

---

## 1. Recommended repository layout

```text
/
  src/app/                  # Next.js pages + API route handlers
  src/server/               # db, extract, openrouter, scoring, integrity, pipeline
  src/components/
  backend/                  # Optional FastAPI (local experiments only)
  package.json
  vercel.json
  docs/
  README.md
```

**Deploy target:** single Vercel project (UI + API same domain via Next.js Route Handlers).

---

## 2. Phase plan

### Phase 0 — Scaffold

**Work**

- Next.js at repo root with App Router + Tailwind
- Neon via `DATABASE_URL` in `.env.local` / Vercel
- Env sample: root `.env.example`
- `GET /api/health` (+ `/health` rewrite)

**Acceptance**

- [ ] `npm run dev` starts the UI
- [ ] `/api/health` returns OK
- [ ] Neon connection succeeds from API routes

---

### Phase 1 — Upload + validation

**Work**

- `POST /api/v1/evaluations` multipart upload
- Validate extension, size (default 5 MB), non-empty
- Create `evaluations` row (`injection_heuristic_hit = false`)
- Run sync pipeline; navigate UI to `/evaluations/[id]`

**Acceptance**

- [ ] Valid PDF/DOCX creates evaluation and returns ID
- [ ] Invalid type/size rejected with 400 and clear message
- [ ] UI shows client-side validation errors when obvious

---

### Phase 2 — Text extraction

**Work**

- Status → `extracting`
- PDF via `unpdf`, DOCX via `mammoth`
- Heuristic section detection
- Persist `cv_extractions`
- Fail if no usable text

**Acceptance**

- [ ] Sample PDF and DOCX produce non-empty `raw_text`
- [ ] Sections JSON populated best-effort
- [ ] Empty/scanned-like files mark evaluation `failed` with safe message

---

### Phase 3 — OpenRouter AI evaluation

**Work**

- Status → `evaluating`
- Rich rubric prompt: summary + section_analysis + many findings
- Anti-gaming prompt layout + heuristics + checklist caps
- Clamp scores; recompute overall in code
- Model fallbacks on 429
- Sync completion inside POST (serverless-safe)

**Acceptance**

- [ ] Model returns parseable findings and category scores
- [ ] Report includes executive summary + section analysis + multiple findings per group
- [ ] Injection-bait CV does not produce artificial perfect scores
- [ ] Rate-limited primary model can fall back successfully when another free model is available

---

### Phase 4 — Persist + report API

**Work**

- Schema ensure on boot (`src/server/db.ts`)
- Write scores + findings (including `summary` / `section_analysis` types)
- `GET /api/v1/evaluations/{id}`
- `GET /api/v1/evaluations/{id}/report`

**Acceptance**

- [ ] Completed evaluation returns full report JSON
- [ ] Incomplete evaluation returns 409 on report
- [ ] Unknown ID returns 404

---

### Phase 5 — Results UI

**Work**

- Processing UI with polling
- Report: overall + bands, executive summary, sections detected, section analysis, strengths/issues/missing/recommendations/improvements
- Error state + evaluate another CTA

**Acceptance**

- [ ] Guest completes Landing → Upload → Processing → Report end-to-end on Vercel
- [ ] Failed evaluations show recoverable UI with clear message
- [ ] Mobile layout readable for report

---

### Phase 5b — Generate resume (rewrite + templates + export)

**Work**

- `cv_rewrites` table + structured CV model
- OpenRouter `rewriteCv` from extraction + findings
- Templates: Classic, Compact (single-column ATS), Sidebar, Split (multi-column)
- Preview UI at `/evaluations/[id]/rewrite`
- Export DOCX (`docx`) and PDF (`@react-pdf/renderer`)

**Acceptance**

- [ ] Report CTA opens rewrite flow
- [ ] User can switch templates and preview
- [ ] Download PDF and DOCX succeed for all 4 templates

---

### Phase 6 — Hardening

**Work**

- Explicit missing-env errors
- Structured logging (no full CV dumps)
- Score integrity suite (TRD §7.1)
- Free-model rate-limit messaging

**Acceptance**

- [ ] Failures are terminal with messages (no infinite spinner)
- [ ] Prompt-injection QA cases pass
- [ ] Env-based config documented in root README

---

### Phase 7 — Phase 2 backlog (explicitly after MVP)

1. Auth + attach `user_id` to evaluations  
2. History list UI  
3. Job Description matching + `job_matches`  
4. Admin analytics dashboard  
5. Private object storage + retention policy  
6. Optional OCR for scanned PDFs  
7. Downloadable PDF **evaluation report** export (resume DOCX/PDF already shipped)  

---

## 3. Suggested build order (summary)

| Order | Phase | Outcome |
|------:|-------|---------|
| 0 | Scaffold | App runs; DB connected |
| 1 | Upload | File in + evaluation ID |
| 2 | Extract | Text + sections stored |
| 3 | AI evaluate | Rich scores/findings from OpenRouter |
| 4 | Persist + APIs | Report endpoint complete |
| 5 | Results UI | User-visible MVP |
| 6 | Harden | Production-ready MVP bar |
| 7 | Phase 2 | History, JD match, admin |

---

## 4. Cross-cutting implementation notes

| Topic | Decision |
|-------|----------|
| Processing model | **Sync** inside `POST /api/v1/evaluations` (required for Vercel serverless) |
| Scoring | Rubric weights in code; overall recomputed server-side |
| Auth | None in MVP |
| File storage | In-request buffer; no public CV URLs |
| API versioning | `/api/v1` |
| Deploy | One Vercel project; same-origin API |
| Docs source of truth | `docs/01`–`06` |
| Score integrity | CV is untrusted data; prompt isolation + heuristics + checklist caps (TRD §7.1) |

---

## 5. MVP definition of done

1. Guest can upload PDF/DOCX and receive a report without login.  
2. API extracts text, evaluates via OpenRouter, stores scores + detailed findings in Neon.  
3. Report shows overall + five category scores (with bands), executive summary, section analysis, and the five finding groups.  
4. Invalid files and failed evaluations show clear errors and a retry path.  
5. Deployed as one Vercel project with documented env vars.

---

## 6. QA checklist (MVP)

- [ ] PDF happy path  
- [ ] DOCX happy path  
- [ ] Reject `.txt` / oversized file  
- [ ] Empty PDF failure  
- [ ] Missing env → clear 500 detail  
- [ ] OpenRouter 429 → fallback or clear rate-limit message  
- [ ] Refresh during processing resumes correctly  
- [ ] Report matches DB scores/findings  
- [ ] “Evaluate another CV” resets to clean upload  
- [ ] Injection-bait CV does not yield gamed perfect scores  
- [ ] Strong CV without injection can still score high  
- [ ] Report includes summary + multiple findings (not a tiny stub list)  

---

## 7. Handoff

After MVP DoD:

- Use PRD success metrics for a short QA pass  
- File Phase 2 tickets from PRD §4.3 and this plan’s Phase 7  
- Keep schema migrations additive for `users` / `job_matches`
