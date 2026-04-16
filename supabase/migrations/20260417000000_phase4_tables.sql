-- ============================================================
-- Phase 4: lessons table, slides table, realtime, storage
-- ============================================================

-- ── lessons ───────────────────────────────────────────────────

create table public.lessons (
  id          uuid primary key default gen_random_uuid(),
  -- Human-readable slug used by the front-end to look up a lesson.
  -- e.g. 'kitchen-technologies'. Must be unique.
  slug        text unique not null,
  unit_id     text,
  title       text not null,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.lessons enable row level security;

-- Authenticated users (students + teachers) can read lessons.
create policy "lessons: authenticated read"
  on public.lessons
  for select
  using (auth.role() = 'authenticated');

-- Teachers can create, update, and delete lessons they own.
create policy "lessons: teacher write own"
  on public.lessons
  for all
  using  (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- ── slides ────────────────────────────────────────────────────

create table public.slides (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid references public.lessons (id) on delete cascade not null,
  sort_order  int not null,
  type        text not null check (type in ('content', 'mcq', 'scaffold', 'review')),
  -- Stores the full SlideConfig JSON (id, section, and all type-specific fields).
  config      jsonb not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  constraint slides_lesson_order unique (lesson_id, sort_order)
);

alter table public.slides enable row level security;

-- Authenticated users can read slides for all lessons.
create policy "slides: authenticated read"
  on public.slides
  for select
  using (auth.role() = 'authenticated');

-- Teachers can write slides for lessons they created.
create policy "slides: teacher write own"
  on public.slides
  for all
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.created_by = auth.uid()
    )
  );

-- ── Realtime ─────────────────────────────────────────────────
-- lesson_submissions and lesson_progress already exist from Phase 3.
-- Add them to the Realtime publication if not already present.
-- Errors are swallowed by the DO block so re-running is safe.

do $$
begin
  begin
    alter publication supabase_realtime add table public.lesson_submissions;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.lesson_progress;
  exception when others then null;
  end;
end;
$$;

-- ── Storage bucket for lesson images ─────────────────────────
-- Creates the 'lesson-images' bucket with public read access.
-- Content and MCQ slide editors upload to this bucket in Phase 5.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'lesson-images',
    'lesson-images',
    true,
    5242880,    -- 5 MB per file
    array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
  )
  on conflict (id) do nothing;

-- Teachers can upload to lesson-images.
create policy "lesson-images: teacher upload"
  on storage.objects
  for insert
  with check (
    bucket_id = 'lesson-images'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'teacher'
    )
  );

-- Anyone (including public/anon) can read lesson images.
create policy "lesson-images: public read"
  on storage.objects
  for select
  using (bucket_id = 'lesson-images');
