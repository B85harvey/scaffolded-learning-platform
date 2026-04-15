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

- [ ] Install Poppins via Google Fonts in `index.html`
- [ ] Set Poppins as default `sans` in `tailwind.config.js`
- [ ] Define extended colour palette in `tailwind.config.js`
- [ ] Define spacing, border-radius, and shadow tokens
- [ ] Create a `Typography` showcase page or Storybook-style component
- [ ] Tag `phase0-step2`

### Step 3 — Supabase Setup

- [ ] Create Supabase project
- [ ] Add environment variables (`.env.local`) — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Install `@supabase/supabase-js`
- [ ] Create `src/lib/supabase.ts` client singleton
- [ ] Define initial database schema (users, groups, sessions, slides, responses)
- [ ] Apply schema via Supabase migrations
- [ ] Tag `phase0-step3`

### Step 4 — Auth (Magic Link)

- [ ] Install and configure Resend
- [ ] Enable Supabase Auth with magic link (email OTP)
- [ ] Wire Resend as custom SMTP in Supabase
- [ ] Create `useAuth` hook
- [ ] Build login page (email input → send magic link)
- [ ] Handle auth callback / session restore on load
- [ ] Protected route wrapper component
- [ ] Tag `phase0-step4`

### Step 5 — Routing & Shell

- [ ] Install TanStack Router (or React Router v6 — decide)
- [ ] Define route structure: `/login`, `/dashboard`, `/session/:id`, `/admin`
- [ ] Build app shell (nav bar, layout wrapper)
- [ ] Implement protected vs. public route guards
- [ ] Tag `phase0-step5`

### Step 6 — TanStack Query Setup

- [ ] Install `@tanstack/react-query`
- [ ] Wrap app in `QueryClientProvider`
- [ ] Configure default stale/cache times
- [ ] Create first query hook as proof-of-concept (e.g. `useCurrentUser`)
- [ ] Tag `phase0-step6`
