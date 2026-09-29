# UI/UX Design Brief

**Product:** CV Evaluation Platform  
**Version:** 1.0 (MVP)  
**Surfaces:** Landing · Upload · Processing · Report · Error

---

## 1. Product personality

| Attribute | Direction |
|-----------|-----------|
| Tone | Professional, calm, trustworthy |
| Domain feel | Career / HR tooling — competent, not playful |
| Voice | Direct, specific, actionable (“Add metrics to bullets”) |
| Promise | Clarity and usefulness over hype |

Avoid: meme copy, alarmist red walls of text, “AI magic” fluff without substance.

---

## 2. Visual direction

### 2.1 Theme

- **Light theme** as default (readable for long reports)
- Clear typographic hierarchy; generous whitespace on landing
- One coherent composition on the first viewport — not a dashboard

### 2.2 Brand on landing

- Product name / heading **“AI-Powered CV Evaluation”** must read as a hero-level signal
- One short supporting sentence under the heading
- One primary CTA group (“Upload your CV”)
- Supported formats as quiet helper text (PDF, DOCX)
- Do **not** overload the first viewport with stats, feature grids, or admin-style widgets

### 2.3 Color & look (guidance)

Define CSS variables early. Prefer a restrained professional palette (e.g. deep navy or charcoal primary, muted accent, soft neutral background with subtle gradient or light texture — not flat pure white only).

Avoid common AI-default looks: purple-on-white / purple-indigo gradients, warm cream + terracotta “editorial” kits, broadsheet dense newspaper layouts, glow-heavy dark mode as default, emoji-led UI.

### 2.4 Motion

2–3 intentional motions only, for example:

1. Soft fade/slide-in of hero text on load
2. Dropzone hover/active state
3. Progress step transition while processing

No decorative particle noise.

---

## 3. Information architecture (MVP)

```text
Landing (+ Upload section)
    → Processing (/evaluations/[id])
        → Report (same route)
        → Error (same route)
```

Report is the densest screen; Landing stays sparse.

---

## 4. Screen layouts (wireframe-level)

### 4.1 Landing / Upload

```text
+--------------------------------------------------+
|  [Logo / wordmark]                               |
|                                                  |
|  AI-Powered CV Evaluation                        |
|  Short one-line explanation.                     |
|                                                  |
|  [ Upload your CV ]                              |
|  PDF and DOCX · Max 5 MB                         |
|                                                  |
|  ┌────────────────────────────────────────────┐  |
|  │  Dropzone: Drag & drop or browse           │  |
|  │  (appears below CTA or as CTA target)      │  |
|  └────────────────────────────────────────────┘  |
+--------------------------------------------------+
```

**Rules:**

- Hero is one composition: brand + headline + sentence + CTA + upload affordance
- No cards in the hero for marketing stats
- Upload control is the interactive container (border/dashed dropzone is fine)

### 4.2 Processing

```text
+--------------------------------------------------+
|  Evaluating: filename.pdf                        |
|                                                  |
|  (progress)  Extracting → Analyzing → Report     |
|                                                  |
|  “This usually takes under a minute.”            |
+--------------------------------------------------+
```

- Status labels map to backend states
- Do not show fake final scores while loading

### 4.3 Report

```text
+--------------------------------------------------+
|  CV Evaluation Report                            |
|  filename.pdf                                    |
|                                                  |
|  Overall  78/100                                 |
|                                                  |
|  ATS 82   Experience 75   Skills 80              |
|  Content 72   Formatting 85                      |
|                                                  |
|  Strengths                                       |
|   · ...                                          |
|  Issues                                          |
|   · ...                                          |
|  Missing information                             |
|   · ...                                          |
|  Recommendations                                 |
|   · ...                                          |
|  Suggested improvements                          |
|   · ...                                          |
|                                                  |
|  [ Evaluate another CV ]                         |
+--------------------------------------------------+
```

**Rules:**

- Overall score is the primary numeric focus
- Category scores secondary (bars or compact score row — not a dashboard of cards)
- Findings use clear section headings; list items with title + detail
- Issue → suggestion pairing when both exist (adjacent or linked by section)
- Sectioned content is encouraged for readability; avoid nested card stacks

### 4.4 Error

```text
+--------------------------------------------------+
|  We couldn’t evaluate this CV                    |
|  User-safe reason text                           |
|  [ Upload a different CV ]                       |
+--------------------------------------------------+
```

---

## 5. Components

| Component | Usage |
|-----------|--------|
| Primary button | Upload CTA, Evaluate another, Retry |
| Dropzone | File intake; drag-active state; selected filename chip |
| Inline validation | Red/neutral helper under dropzone — short |
| Progress steps | 3 steps: Upload received → Extracting → Analyzing |
| Overall score display | Large numeral `/100` |
| Category score row | Label + value; optional thin bar |
| Finding block | Type label + title + detail paragraph |
| Empty/loading skeletons | Processing only; not on landing |

**Finding type visual cues (accessible, not color-only):**

| Type | Cue |
|------|-----|
| Strength | Label “Strength” + calm positive accent |
| Issue | Label “Issue” + warning accent |
| Missing | Label “Missing” + strong attention accent |
| Recommendation | Label “Recommendation” |
| Improvement | Label “Suggestion” + example text in muted panel |

Do not rely on emoji as the only indicator; text labels are required. Optional icons may support labels.

---

## 6. Copy guidelines

| Context | Style |
|---------|--------|
| Landing | One sentence benefit; no jargon stack |
| Errors | Specific and calm: “Only PDF and DOCX are supported.” |
| Issues | Concrete: “Your experience bullets don't clearly mention measurable results.” |
| Suggestions | Actionable: “Add measurable outcomes such as revenue generated, performance improvement, users served, etc.” |
| Processing | Honest wait copy; no false precision (“99% complete”) unless real |

Avoid blaming the user. Prefer “Your CV…” / “This section…” framing.

---

## 7. Accessibility

- Semantic headings (`h1` product title on landing; report title as `h1`)
- Dropzone operable via keyboard and file input
- Color contrast AA for text and score labels
- Progress updates announced politely (aria-live polite on status change)
- Focus visible on buttons and controls
- Do not convey finding severity by color alone

---

## 8. Responsive behavior

| Breakpoint | Behavior |
|------------|----------|
| Mobile | Single column; hero stacks; dropzone full width; category scores stack or wrap |
| Tablet / Desktop | Wider measure for report prose (~65–75ch for findings); scores in a horizontal row |

Report must remain readable on mobile without horizontal scrolling.

---

## 9. Explicit non-goals for MVP UI

- Admin dashboard chrome
- History tables
- JD match panels
- Marketing feature-card grids on the first viewport
- Dark-mode-first aesthetic
- Download PDF button (unless later added as nice-to-have)

---

## 10. Design acceptance checklist

- [ ] First viewport reads as one branded composition
- [ ] Upload validation errors are visible and recoverable
- [ ] Processing states are understandable without technical jargon
- [ ] Report shows overall + 5 categories + five finding groups
- [ ] Mobile report is readable
- [ ] Primary actions are obvious: Upload / Evaluate another
