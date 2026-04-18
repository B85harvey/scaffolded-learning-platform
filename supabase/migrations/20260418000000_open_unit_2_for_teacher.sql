-- ============================================================
-- Dev unblock: make the Kitchen Technologies unit visible on
-- /home for the teacher account (b85harvey@gmail.com).
--
-- Without this, a fresh production database seeded only with
-- the lesson + slides will render the "No units available"
-- empty state because /home joins unit_assignments through
-- class_members.
--
-- This migration:
--   1. Finds or creates a class owned by the teacher.
--   2. Adds the teacher as a class member so /home has
--      something to resolve.
--   3. Opens Unit 2 (the Kitchen Technologies unit) for that
--      class with status = 'open'.
--
-- Fully idempotent: safe to re-run.
-- ============================================================

DO $$
DECLARE
  v_user_id  uuid;
  v_class_id uuid;
BEGIN
  SELECT id
    INTO v_user_id
    FROM auth.users
   WHERE email = 'b85harvey@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Teacher account b85harvey@gmail.com not found; skipping.';
    RETURN;
  END IF;

  -- 1. Ensure a class exists for this teacher.
  SELECT id
    INTO v_class_id
    FROM public.classes
   WHERE teacher_id = v_user_id
   LIMIT 1;

  IF v_class_id IS NULL THEN
    INSERT INTO public.classes (teacher_id, name)
    VALUES (v_user_id, 'My Class')
    RETURNING id INTO v_class_id;
  END IF;

  -- 2. Ensure the teacher is also a member of that class
  --    (so /home can find assignments via class_members).
  IF NOT EXISTS (
    SELECT 1
      FROM public.class_members
     WHERE class_id = v_class_id
       AND student_id = v_user_id
  ) THEN
    INSERT INTO public.class_members (class_id, student_id)
    VALUES (v_class_id, v_user_id);
  END IF;

  -- 3. Ensure unit-2 is open for the class.
  IF NOT EXISTS (
    SELECT 1
      FROM public.unit_assignments
     WHERE class_id = v_class_id
       AND unit_id = 'unit-2'
  ) THEN
    INSERT INTO public.unit_assignments (unit_id, class_id, status, opened_at)
    VALUES ('unit-2', v_class_id, 'open', now());
  ELSE
    UPDATE public.unit_assignments
       SET status    = 'open',
           opened_at = COALESCE(opened_at, now())
     WHERE class_id = v_class_id
       AND unit_id  = 'unit-2';
  END IF;
END $$;
