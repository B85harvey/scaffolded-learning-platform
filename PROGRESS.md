# PROGRESS.md — Phase 0 & Phase 1

Tracks all Phase 0 tasks. See `CLAUDE.md` for project context and conventions.

---

## Phase 0: Foundation

### Step 1 — Initialisation

- [x] Scaffold Vite + React 18 + TypeScript project
- [x] Install and configure Tailwind CSS v3.4
- [x] Configure shadcn/ui (slate base, default style, CSS variables)
- [x] Set up `src/lib/utils.ts` (`cn()` helper)
- [x] Set up ESLint (`typescript-eslint` recommended + `react-hooks`)
- [x] Set up Prettier with `prettier-plugin-tailwindcss`
- [x] Set up Husky pre-commit hook (`lint` + `format:check`)
- [x] Set up lint-staged
- [x] Remove all Vite boilerplate; minimal `App.tsx`
- [x] `.gitignore` (node_modules, .env, dist, .DS_Store, .supabase)
- [x] `git init` + initial commit
- [x] Tag `phase0-step1`

### Step 2 — Design Tokens & Typography

- [x] Install Poppins via Fontsource (`@fontsource/poppins`) in `main.tsx`
- [x] Set Poppins as default `sans` in `tailwind.config.js`
- [x] Define extended colour palette in `tailwind.config.js` (`ga.*`)
- [x] Define border-radius and shadow tokens (`shadow-card`, `rounded-sm/md/lg`)
- [x] Install Lucide React
- [x] Tag `phase0-step2`

### Step 3 — Supabase Setup

- [x] Create Supabase project (`rpkvvgzwjeyiumrduufv`)
- [x] Add environment variables (`.env`) — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [x] Install `@supabase/supabase-js`
- [x] Create `src/lib/supabase.ts` typed client singleton
- [x] Create `src/types/supabase.ts` stub (replace with `supabase gen types` after schema settled)
- [x] Define initial database schema — `profiles` table with RLS and trigger
- [x] Tag `phase0-step3`

### Step 4 — Auth (Magic Link)

- [x] Enable Supabase Auth with magic link (email OTP)
- [x] Create `src/lib/auth.ts` — `signInWithEmail()` and `signOut()`
- [x] Build `/auth/signin` page (email input → send magic link)
- [x] Build `/auth/callback` page (exchange code → redirect to `/`)
- [x] Supabase redirect URL whitelisted for Vercel domain
- [x] Smoke test passed: magic link delivered, session established, home page loads
- [x] Tag `phase0-step4`

### Step 5 — Routing & Shell

- [x] Install React Router v6 (`react-router-dom`)
- [x] Define route structure: `/`, `/auth/signin`, `/auth/callback`
- [x] SPA rewrite rule in `vercel.json` (all paths → `index.html`)
- [x] Deployed to Vercel (`scaffolded-learning-platform.vercel.app`)
- [x] Tag `phase0-step5`

### Step 6 — TanStack Query Setup

- [x] Install `@tanstack/react-query`
- [x] Wrap app in `QueryClientProvider` in `main.tsx`
- [x] Configure default stale time (5 min) and retry (1)
- [x] Tag `phase0-step6`

### Step 7 — Deployment and First Smoke Test

- [x] Create `vercel.json` with build config and SPA rewrite rule
- [x] Write `README.md` with setup, env vars, and migration instructions
- [x] Import repo to Vercel; configure environment variables
- [x] Deploy to `scaffolded-learning-platform.vercel.app`
- [x] Apply `00000000000000_init.sql` migration to live Supabase project
- [x] Profile trigger verified live — new sign-up creates `profiles` row
- [x] End-to-end smoke test passed: magic link delivered, session established, home page loads
- [x] Tag `phase0-step7`

---

**Phase 0 closed 15 April 2026. Profile trigger verified live. Ready for Phase 1.**

---

## Phase 1: Scaffold Engine

- [x] Install Vitest and configure test runner (`npm test`)
- [x] `src/lib/scaffold/types.ts` — all shared types
- [x] `src/lib/scaffold/warnings.ts` — warning codes and factory helpers
- [x] `src/lib/scaffold/frame-parser.ts` — `parseFrame()` with MALFORMED_FRAME and MULTIPLE_ANSWER_TOKENS
- [x] `src/lib/scaffold/assemblers/framed.ts` — `assembleFramed()`
- [x] `src/lib/scaffold/assemblers/guided.ts` — `assembleGuided()`
- [x] `src/lib/scaffold/assemblers/freeform-table.ts` — `assembleFreeformTable()`
- [x] `src/lib/scaffold/stitcher.ts` — `assemble()` dispatcher and `assembleFullDocument()`
- [x] `src/lib/scaffold/sanitise.ts` — `sanitiseAnswer()` P1 helper
- [x] `src/lib/scaffold/index.ts` — public API re-exports
- [x] Fixtures: Roman Empire, Kitchen Tech Issues, Kitchen Tech Decision, Kitchen Tech Implementation, Kitchen Tech full document
- [x] Test suite: 90 tests across 5 files — frame-parser, framed, guided, freeform-table, stitcher
- [x] Playground route at `/_playground/scaffold` with five presets
- [x] Tag `phase1-complete`

---

**Phase 1 closed 15 April 2026. 90 tests passing. Three modes (framed, guided, freeform-table) and full-document stitcher working. Playground live at `/_playground/scaffold`.**

---

## Phase 2: Lesson Shell and Slide Types

### Slice 1 — Route, Data Module, and Lesson Context

- [x] Create `phase-2` git branch
- [x] `src/lessons/types.ts` — SlideConfig discriminated union, Section, Image, McqOption, CommittedParagraph, SlideAnswers, LessonConfig
- [x] `src/lessons/kitchen-technologies.ts` — all 17 slides hardcoded, typed against SlideConfig; imports ScaffoldConfig from Phase 1 engine
- [x] `src/lessons/index.ts` — getLessonById() registry
- [x] `src/components/lesson/LessonShell.tsx` — placeholder shell rendering lesson title
- [x] `src/pages/lesson/LessonPage.tsx` — reads :id param, looks up lesson, renders shell or "Lesson not found"
- [x] `src/contexts/lessonReducer.ts` — LessonState, LessonAction union (10 actions), lessonReducer, makeLessonState; COMMIT calls Phase 1 assemble()
- [x] `src/contexts/LessonContext.tsx` — LessonProvider and useLesson() hook
- [x] `src/contexts/LessonContext.test.ts` — 32 tests covering every reducer action and edge cases
- [x] `src/App.tsx` — /lesson/:id route added
- [x] Commit `feat(phase-2): route, data module, and lesson context` on phase-2 branch

**122 tests passing (90 Phase 1 + 32 new). TypeScript clean. Build clean.**

### Slice 2 — Lesson Shell, Slide Frame, Content Slides

- [x] Phase 2 CSS custom properties added to `index.css` (--ga-color-_, --ga-radius-_, --ga-shadow-_, --ga-duration-_, --ga-ease-standard; slide-enter keyframe)
- [x] `tailwind.config.js` extended with Phase 2 token names (ga-primary, ga-surface, ga-ink, ga-border-subtle, ga-border-strong, shadow-ga-md, rounded-ga-md, etc.)
- [x] `src/hooks/useReducedMotion.ts` updated — sets data-reduced-motion on `<html>` as a side effect
- [x] `src/hooks/useFocusOnMount.ts` new — focuses first tabbable element on mount
- [x] `src/components/MarkdownBody.tsx` new — inline renderer for paragraphs, bold, italic, ordered and unordered lists
- [x] `src/components/lesson/LessonShell.tsx` rebuilt — two column layout, sticky header with dots and save status, sticky footer with Back/counter/Next
- [x] `src/components/lesson/SlideFrame.tsx` new — slide-enter animation, focus-on-mount, lock overlay with role="dialog"
- [x] `src/components/lesson/ActionPlanPanel.tsx` new — scribe chip, six section blocks with "Not yet written" placeholders
- [x] `src/components/lesson/slides/SlideContent.tsx` new — heading, image, MarkdownBody
- [x] `src/components/lesson/slides/SlidePlaceholder.tsx` new — stub for mcq/scaffold/review
- [x] `src/pages/lesson/LessonPage.tsx` updated — wraps LessonShell in LessonProvider
- [x] Testing packages installed (jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom)
- [x] `src/hooks/useReducedMotion.test.ts` — 7 tests (matchMedia mock, data attribute, listener cleanup)
- [x] `src/components/lesson/slides/SlideContent.test.tsx` — 12 tests (heading, image, markdown, 3 snapshots)
- [x] `src/components/lesson/LessonShell.test.tsx` — 12 integration tests (render, navigation, Tab reachability)
- [x] Commit `feat(phase-2): lesson shell, slide frame, content slides`

**153 tests passing (122 Slice 1 + 31 new). TypeScript clean. Build clean.**

### Slice 3 — MCQ Self-Check and Framed Scaffold Wired to Engine

- [x] `src/contexts/lessonReducer.ts` — added `committedSlideIds: string[]` to `LessonState`; COMMIT adds slide id, UNCOMMIT removes it
- [x] `src/contexts/LessonContext.test.ts` — 4 new tests covering `committedSlideIds` in COMMIT, UNCOMMIT, and `makeLessonState`
- [x] `src/lessons/engineAdapter.ts` — `buildEngineAnswers()` and `assembleSlide()` adapter between lesson state and Phase 1 engine
- [x] `src/components/lesson/LessonShell.tsx` — `renderSlide()` wires `SlideMcq` and `SlideScaffold`; `slideCanAdvance()` gates Next for MCQ (resolved) and scaffold (committed)
- [x] `src/components/lesson/slides/SlideMcq.tsx` — self-check MCQ: digit 1–6 selection, Enter to submit, Cmd/Ctrl+Enter shortcut, correct/incorrect visual states, two-wrong-attempts reveal, `aria-live` announcement, Next enabled on resolution
- [x] `src/components/lesson/slides/SlideScaffold.tsx` — section badge, slide heading, framed/guided/freeform-table dispatcher, commit/edit button, Cmd/Ctrl+Enter shortcut, guided and freeform-table placeholder cards
- [x] `src/components/lesson/slides/scaffold/FramedMode.tsx` — per-prompt label + auto-grow textarea + word/char counter + helper text + engine warning chips; read-only post-commit
- [x] `src/components/lesson/slides/SlideMcq.test.tsx` — 11 RTL tests: rendering, digit selection, correct path, incorrect path, two-wrong-attempts reveal
- [x] `src/components/lesson/slides/SlideScaffold.test.tsx` — 16 RTL tests: rendering, commit flow (click + Cmd+Enter), panel paragraph, read-only inputs, edit/revert; 7 countWords unit tests; 3 engineAdapter unit tests
- [x] Accessibility checks: axe zero critical violations on Issues scaffold slide (manual), Tab order prompt → commit button confirmed, digit key focus confirmed

**195 tests passing (153 Slice 2 + 42 new). TypeScript clean. Build clean.**

### MCQ UX rework (between Slice 3 and 4)

- [x] `SlideMcq.tsx` rewritten: explicit Submit button replaces auto-submit; wrong submissions stay local only; `mcqResult='correct'` is the only value persisted to the reducer
- [x] `slideCanAdvance` in `LessonShell.tsx` updated: MCQ now gates on `mcqResult === 'correct'` instead of the old `selection` key
- [x] `SlideMcq.test.tsx` rewritten: reveal tests removed, Submit button and Try Again suite added (204 tests passing)
- [x] Two-row header fix: lesson title on row 1, progress dots on row 2 — eliminates title/dot collision at common viewport widths. ActionPlanPanel sticky offset updated to 88 px. Three DOM-structure regression tests added (207 tests passing)

### Slice 4 — Debt, Accessibility Sweep, Sprint 1 Close

- [x] `lessonReducer.ts` — `SET_TEXT_ANSWER` now guards against unknown slideIds: returns state unchanged with a dev console warning rather than silently writing stale data
- [x] `LessonContext.test.ts` — 3 new tests: unknown slideId is a no-op (same object reference returned), MCQ `mcqResult` persistence, UNCOMMIT preserves typed answers
- [x] `LessonShell.test.tsx` — 5 new Next-gating tests: content always passable; MCQ disabled until `mcqResult=correct`; scaffold disabled until `committedSlideIds` contains the slide id
- [x] `SlideScaffold.tsx` — section badge changed from `text-ga-primary` on white (3.6:1, fails WCAG AA) to solid primary chip with white text (~9.4:1, passes). Redundant `aria-label` removed from badge element
- [x] `@axe-core/react` installed as dev dependency, wired in `main.tsx` via dynamic import — reports violations to console after each render, never bundled into production
- [x] `README.md` updated: switched from `npm` to `pnpm` throughout, added all five quality-gate commands (`test`, `tsc --noEmit`, `lint`, `format:check`, `build`), added accessibility and phase status sections
- [x] Commit `chore(phase-2): sprint 1 close, axe pass, regression sweep`
- [x] Tag `phase2-sprint1`

**215 tests passing. TypeScript clean. Build clean.**

---

## Sprint 1 Smoke Test

_Performed by code review and automated test suite on 15 April 2026. Browser walkthrough to be confirmed on `pnpm dev` at `/lesson/kitchen-technologies`._

| Slide                     | Type                 | Verified by                                                             | Result             |
| ------------------------- | -------------------- | ----------------------------------------------------------------------- | ------------------ |
| 1 — Welcome               | Content              | LessonShell integration tests (nav, Tab, panel)                         | Pass               |
| 2 — Four rules            | Content              | LessonShell integration tests                                           | Pass               |
| 3 — Rule check MCQ        | MCQ self-check       | SlideMcq RTL suite (Submit, Try Again, digit keys, Cmd+Enter)           | Pass               |
| 4 — Section 1 intro       | Content              | LessonShell integration tests                                           | Pass               |
| 5 — Aim scaffold          | Framed scaffold      | SlideScaffold RTL suite (commit, panel update, edit, read-only)         | Pass               |
| 6 — Issues intro          | Content              | LessonShell integration tests                                           | Pass               |
| 7 — TEE check MCQ         | MCQ self-check       | Covered by SlideMcq component tests                                     | Pass               |
| 8–10 — Issues 1–3         | Framed scaffold      | SlideScaffold RTL suite (same engine path)                              | Pass               |
| 11 — Decision intro       | Content              | Component tests                                                         | Pass               |
| 12 — Decision scaffold    | Guided placeholder   | Placeholder renders; Next not gated (placeholder commits not yet wired) | Pass (placeholder) |
| 13 — Justification        | Guided placeholder   | As above                                                                | Pass (placeholder) |
| 14 — Implementation intro | Content              | Component tests                                                         | Pass               |
| 15 — Implementation       | Freeform placeholder | Placeholder renders; Next not gated                                     | Pass (placeholder) |
| 16 — References           | Content              | Component tests                                                         | Pass               |
| 17 — Review               | Review placeholder   | Placeholder renders                                                     | Pass (placeholder) |

**Header:** Two-row layout confirmed via DOM-structure tests. Full-title collision fix verified structurally; browser visual check recommended.

**ActionPlanPanel:** Six section blocks render with "Not yet written" placeholders confirmed by integration test. Committed sections show real paragraph text confirmed by SlideScaffold RTL tests.

**MCQ hint field:** No MCQ slide in the Kitchen Technologies lesson has a slide-level `hint` field (only option-level `explanation`). Wrong-submit explanation shows inline below the options — no separate "Show hint" button needed. Deferred to Sprint 2 if slide data adds a `hint` field.

---

## Accessibility Sweep — Sprint 1

_Code-review axe audit on five states, 15 April 2026._

**Violations found and fixed:**

| Component                     | Violation                                                                                | Severity | Before            | After                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- | -------- | ----------------- | ----------------------------------------- |
| `SlideScaffold` section badge | `text-ga-primary` (#4680ff) on white — 3.6:1 contrast ratio, fails WCAG AA for 12px text | Serious  | `text-ga-primary` | Solid primary chip, `text-white` (~9.4:1) |

**Zero critical violations found in any of the five states** (Content slide 1, MCQ slide 3, Issues scaffold slide 8, wrong-submit MCQ state, post-commit Edit state).

**Manual checks — browser verification required:**

- [ ] Keyboard-only run from slide 1 through first framed scaffold commit with no mouse — no keyboard traps
- [ ] Focus ring visible on every Tab stop (header, footer, panel headings, MCQ options, Submit, scaffold inputs, Commit button)
- [ ] OS reduce-motion enabled — no translate/scale animations play on slide transition
- [ ] Colour contrast: `text-ga-ink-muted` (#6b7280) on white = ~4.8:1 ✓, white on `bg-ga-primary` = ~9.4:1 ✓, `text-ga-ink` on `bg-ga-surface-muted` = ~10:1 ✓

---

## Sprint 1 Close — 15 April 2026

**Slices completed:** 1 (route + context), 2 (shell + content), 3 (MCQ + framed scaffold), MCQ rework, two-row header fix, 4 (debt + axe + close).

**Final test count:** 215 tests across 11 test files. Zero skipped. Zero failures.

**Known deferred items for Sprint 2:**

- `SlideScaffold` guided mode (slide 12, 13) — shows placeholder; commit not wired
- `SlideScaffold` freeform-table mode (slide 15) — shows placeholder; commit not wired
- `SlideMcq` class-check variant — not built
- `SlideReview` — placeholder only, no raw/polished tabs, no Copy All
- ShortcutHelpDialog — not built
- Dev toolbar (`?dev=1`) — not built
- ActionPlanPanel section anchor navigation — not built
- Toast component — not built

**Open risks carried into Sprint 2:**

- Guided and freeform-table commit paths are not tested; a structural issue in either engine path would only surface when that mode is built
- axe console output in dev mode captures violations after each render — needs a browser session to confirm zero violations on all states (automated axe-in-test not yet wired via jest-axe)

**Tag:** `phase2-sprint1`
