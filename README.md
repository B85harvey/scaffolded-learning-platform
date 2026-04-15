# Scaffolded Learning Platform

A classroom web platform for guiding Year 11 Food & Hospitality students through structured learning sequences — content slides, multiple-choice questions, and scaffolded writing prompts that assemble into a paragraph response. Built for laptop use in the classroom. Solo project by Ben Harvey.

---

## Local development

```bash
git clone https://github.com/B85harvey/scaffolded-learning-platform.git
cd scaffolded-learning-platform
npm install
cp .env.example .env   # then fill in your real values (see below)
npm run dev
```

The app runs at `http://localhost:5173`.

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable                    | Description                                                                     |
| --------------------------- | ------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`         | Your Supabase project URL (Settings → API)                                      |
| `VITE_SUPABASE_ANON_KEY`    | Supabase `anon` / `public` key (Settings → API)                                 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` secret key — never expose to the browser                |
| `RESEND_API_KEY`            | Resend API key for transactional email                                          |
| `APP_URL`                   | Base URL of the app (`http://localhost:5173` locally, Vercel URL in production) |

`VITE_` prefixed variables are bundled into the client. All others are server-side only.

---

## Database migrations

The database schema lives in `supabase/migrations/`. To apply migrations to the live Supabase project:

```bash
# Link the CLI to your project (one-time setup)
npx supabase link --project-ref rpkvvgzwjeyiumrduufv

# Push all pending migrations
npx supabase db push
```

To generate up-to-date TypeScript types after a schema change:

```bash
npx supabase gen types typescript --project-id rpkvvgzwjeyiumrduufv > src/types/supabase.ts
```

---

## Scripts

| Script                 | Description                                |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Start local dev server                     |
| `npm run build`        | Production build (TypeScript check + Vite) |
| `npm run preview`      | Preview the production build locally       |
| `npm run lint`         | ESLint                                     |
| `npm run format`       | Prettier (write)                           |
| `npm run format:check` | Prettier (check only, used in CI)          |

---

## Phase status

See [PROGRESS.md](./PROGRESS.md) for the current Phase 0 task checklist.
