-- ============================================================
-- Phase 3: class management, groups, assignments, lesson data
-- ============================================================

-- ── classes ──────────────────────────────────────────────────

create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid references auth.users (id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now()
);

alter table public.classes enable row level security;

create policy "classes: teachers manage own"
  on public.classes
  for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- ── class_members ─────────────────────────────────────────────

create table public.class_members (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid references public.classes (id) on delete cascade,
  student_id  uuid references auth.users (id) on delete cascade,
  joined_at   timestamptz default now()
);

alter table public.class_members enable row level security;

-- Students can see their own membership
create policy "class_members: student reads own"
  on public.class_members
  for select
  using (auth.uid() = student_id);

-- Teachers can manage membership for their classes
create policy "class_members: teacher manages"
  on public.class_members
  for all
  using (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  );

-- ── groups ────────────────────────────────────────────────────

create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   text not null,
  class_id    uuid references public.classes (id) on delete cascade,
  group_name  text not null
);

alter table public.groups enable row level security;

-- Students can see groups for lessons they are enrolled in
create policy "groups: students read enrolled"
  on public.groups
  for select
  using (
    exists (
      select 1 from public.class_members cm
      where cm.class_id = groups.class_id and cm.student_id = auth.uid()
    )
  );

-- Teachers can manage groups for their classes
create policy "groups: teacher manages"
  on public.groups
  for all
  using (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  );

-- ── group_members ─────────────────────────────────────────────

create table public.group_members (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references public.groups (id) on delete cascade,
  student_id  uuid references auth.users (id) on delete cascade,
  is_scribe   boolean default false
);

alter table public.group_members enable row level security;

-- Students can see group membership for lessons they are enrolled in
create policy "group_members: students read enrolled"
  on public.group_members
  for select
  using (
    exists (
      select 1 from public.groups g
      join public.class_members cm on cm.class_id = g.class_id
      where g.id = group_id and cm.student_id = auth.uid()
    )
  );

-- Teachers can manage group membership for their classes
create policy "group_members: teacher manages"
  on public.group_members
  for all
  using (
    exists (
      select 1 from public.groups g
      join public.classes c on c.id = g.class_id
      where g.id = group_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.groups g
      join public.classes c on c.id = g.class_id
      where g.id = group_id and c.teacher_id = auth.uid()
    )
  );

-- ── unit_assignments ──────────────────────────────────────────

create table public.unit_assignments (
  id          uuid primary key default gen_random_uuid(),
  unit_id     text not null,
  class_id    uuid references public.classes (id) on delete cascade,
  status      text not null default 'draft'
                check (status in ('draft', 'open', 'closed')),
  opened_at   timestamptz,
  closed_at   timestamptz
);

alter table public.unit_assignments enable row level security;

-- Students can see assignments for their class
create policy "unit_assignments: students read enrolled"
  on public.unit_assignments
  for select
  using (
    exists (
      select 1 from public.class_members cm
      where cm.class_id = unit_assignments.class_id and cm.student_id = auth.uid()
    )
  );

-- Teachers can manage assignments for their classes
create policy "unit_assignments: teacher manages"
  on public.unit_assignments
  for all
  using (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  );

-- ── slide_locks ───────────────────────────────────────────────

create table public.slide_locks (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   text not null,
  class_id    uuid references public.classes (id) on delete cascade,
  slide_id    text not null,
  locked      boolean default false,
  updated_at  timestamptz default now()
);

alter table public.slide_locks enable row level security;

-- Students can see locks for their class lessons
create policy "slide_locks: students read enrolled"
  on public.slide_locks
  for select
  using (
    exists (
      select 1 from public.class_members cm
      where cm.class_id = slide_locks.class_id and cm.student_id = auth.uid()
    )
  );

-- Teachers can manage locks for their classes
create policy "slide_locks: teacher manages"
  on public.slide_locks
  for all
  using (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = auth.uid()
    )
  );

-- Enable Realtime on slide_locks so students receive live lock updates
alter publication supabase_realtime add table slide_locks;

-- ── lesson_submissions ────────────────────────────────────────

create table public.lesson_submissions (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid references auth.users (id) on delete cascade,
  lesson_id            text not null,
  slide_id             text not null,
  section              text,
  prompt_answers       jsonb,
  committed_paragraph  text,
  committed_at         timestamptz default now()
);

alter table public.lesson_submissions enable row level security;

-- Students can select/insert/update their own submissions
create policy "lesson_submissions: student manages own"
  on public.lesson_submissions
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- Teachers can read all submissions for their classes (via class_members)
create policy "lesson_submissions: teacher reads class"
  on public.lesson_submissions
  for select
  using (
    exists (
      select 1 from public.class_members cm
      join public.classes c on c.id = cm.class_id
      where cm.student_id = lesson_submissions.student_id
        and c.teacher_id = auth.uid()
    )
  );

-- ── lesson_drafts ─────────────────────────────────────────────

create table public.lesson_drafts (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid references auth.users (id) on delete cascade,
  lesson_id   text not null,
  slide_id    text not null,
  prompt_id   text not null,
  value       text,
  updated_at  timestamptz default now(),
  unique (student_id, lesson_id, slide_id, prompt_id)
);

alter table public.lesson_drafts enable row level security;

-- Students can select/insert/update their own drafts
create policy "lesson_drafts: student manages own"
  on public.lesson_drafts
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- Teachers can read drafts for their classes
create policy "lesson_drafts: teacher reads class"
  on public.lesson_drafts
  for select
  using (
    exists (
      select 1 from public.class_members cm
      join public.classes c on c.id = cm.class_id
      where cm.student_id = lesson_drafts.student_id
        and c.teacher_id = auth.uid()
    )
  );

-- ── lesson_progress ───────────────────────────────────────────

create table public.lesson_progress (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid references auth.users (id) on delete cascade,
  lesson_id            text not null,
  current_slide_index  int default 0,
  status               text not null default 'not_started'
                         check (status in ('not_started', 'in_progress', 'complete')),
  updated_at           timestamptz default now(),
  unique (student_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

-- Students can select/insert/update their own progress
create policy "lesson_progress: student manages own"
  on public.lesson_progress
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- Teachers can read progress for their classes
create policy "lesson_progress: teacher reads class"
  on public.lesson_progress
  for select
  using (
    exists (
      select 1 from public.class_members cm
      join public.classes c on c.id = cm.class_id
      where cm.student_id = lesson_progress.student_id
        and c.teacher_id = auth.uid()
    )
  );
