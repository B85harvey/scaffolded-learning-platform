# CLAUDE.md — Scaffolded Learning Platform

Development-facing memory for AI assistants working on this codebase.

---

## Project

**Scaffolded Learning Platform.** A web platform for guiding Year 11 Food & Hospitality students through content slides, multiple-choice questions, and scaffolded writing slides that assemble into a paragraph response. Solo build by Ben Harvey.

---

## Stack

| Layer        | Technology                                                             |
| ------------ | ---------------------------------------------------------------------- |
| Frontend     | React 18 + TypeScript + Vite                                           |
| Styling      | Tailwind CSS v3 + shadcn/ui (slate base, default style, CSS variables) |
| Backend / DB | Supabase (Postgres + Auth + Storage)                                   |
| Email        | Resend (transactional, magic link auth)                                |
| Hosting      | Vercel (planned)                                                       |
| Icons        | Lucide React                                                           |
| Typeface     | Poppins (400, 500, 600, 700)                                           |

---

## Current Phase

**Phase 0: Foundation.** See `PROGRESS.md` for detailed task status.

---

## Conventions

### Icons

- Lucide React only. Never use inline SVG or other icon libraries.

### Fonts

- Poppins (weights 400, 500, 600, 700) as the default `sans-serif` family.
- Loaded via Google Fonts in `index.html`.

### Colour

- Use the Tailwind colour tokens defined in `tailwind.config.js`.
- Never hardcode hex values in components. Always use a token class or CSS variable.

### File Structure

```
src/
  components/   # Shared UI components
  hooks/        # Custom React hooks
  lib/          # Utilities, Supabase client, helpers
  pages/        # Page-level components (one per route)
  types/        # TypeScript type and interface definitions
```

### Styles

- Tailwind utility classes throughout.
- Use the `cn()` helper from `@/lib/utils` for conditional or merged class names.

### State Management

- React local state (`useState`, `useReducer`) first.
- TanStack Query for all server state (fetching, caching, mutations).
- No Redux unless a genuinely global, non-server state need arises.

### Accessibility

- Every interactive component must be keyboard-navigable.
- All images, icons, and non-text elements must have appropriate `aria-label` or `alt` text.
- WCAG 2.1 AA minimum across all UI.

### Language

- UK / Australian English in all UI copy, comments, and documentation.
  - Prefer: colour, organise, practise (verb), licence (noun), programme, analyse.

### Path Aliases

- `@/` maps to `src/`. Use it for all internal imports.

---

## What This Platform Is NOT

- **Not mobile.** MVP targets laptop-only use in a classroom. Do not add responsive/mobile work unless explicitly requested.
- **Not real-time collaborative.** One designated scribe per group submits answers on behalf of the group.
- **Not a media-rich editor.** Content slides support text and one optional image. No video embeds, no rich text formatting.
