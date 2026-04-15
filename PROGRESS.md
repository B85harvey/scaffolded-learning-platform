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
