-- Adds new class metadata columns to attendance sessions.
alter table if exists public.attendance_sessions
  add column if not exists course_code text,
  add column if not exists semester text,
  add column if not exists academic_year text;

-- Restrict semester values to known options while still allowing NULL.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_sessions_semester_check'
      and conrelid = 'public.attendance_sessions'::regclass
  ) then
    alter table public.attendance_sessions
      add constraint attendance_sessions_semester_check
      check (semester in ('1st Semester', '2nd Semester', '3rd Semester'));
  end if;
end $$;
