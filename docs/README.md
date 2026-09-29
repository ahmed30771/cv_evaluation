# CV Evaluation Platform — Documentation

Project documentation for the AI-Powered CV Evaluation Platform.

**Stack:** Next.js (frontend) · FastAPI/Python (backend) · PostgreSQL on Neon · OpenRouter  
**MVP:** Upload CV → Extract text → AI evaluation → Score → Report  
**Phase 2:** Auth/history, Job Description matching, Admin analytics  
**Integrity:** CV text is untrusted — prompt-injection / score-gaming defenses are specified in [02-trd.md](02-trd.md) §7.1 (also PRD NFR-9 / risks).

## Documents

| # | Document | Description |
|---|----------|-------------|
| 1 | [Product Requirements Document](01-prd.md) | Vision, scope, functional/non-functional requirements, success metrics |
| 2 | [Technical Requirements Document](02-trd.md) | Architecture, APIs, scoring rubric, security, environment |
| 3 | [AppFlow](03-appflow.md) | Features, screens, navigation logic, evaluation state machine |
| 4 | [UI/UX Design Brief](04-uiux-brief.md) | Visual direction, screen layouts, components, copy guidelines |
| 5 | [Backend Schema](05-backend-schema.md) | PostgreSQL tables, indexes, API JSON payloads |
| 6 | [Implementation Plan](06-implementation-plan.md) | Phased build order, acceptance criteria, MVP definition of done |

## Reading order

1. Start with the **PRD** for product intent and MVP boundaries.
2. Read the **TRD** and **Backend Schema** for technical design.
3. Use **AppFlow** and **UI/UX Brief** for frontend/navigation work.
4. Follow the **Implementation Plan** for build sequencing.
