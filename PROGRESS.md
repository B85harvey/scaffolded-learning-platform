# PROGRESS.md — Phase 0: Foundation

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
