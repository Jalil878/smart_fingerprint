-- Add status column to attendance_session_students
-- Run this migration on an existing database. For fresh installs, supabase-attendance.sql now includes it.

alter table public.attendance_session_students
add column if not exists status text default 'active';

-- Fix existing check constraint if it lacks warning/drop
do $$
begin
  -- drop old constraint if exists (allows idempotent re-run when migrating from enrolled/active/dropped only)
  if exists (
    select 1 from pg_constraint
    where conname = 'attendance_session_students_status_check'
      and conrelid = 'public.attendance_session_students'::regclass
  ) then
    alter table public.attendance_session_students drop constraint attendance_session_students_status_check;
  end if;
  alter table public.attendance_session_students
    add constraint attendance_session_students_status_check
    check (status in ('active', 'warning', 'drop', 'enrolled', 'dropped'));
  -- normalize nulls / old value
  update public.attendance_session_students set status = 'active' where status is null or status = 'enrolled';
end $$;

-- Allow faculty to update status (needed if you edit status from app)
grant update on public.attendance_session_students to authenticated;

drop policy if exists "Faculty can update own attendance students" on public.attendance_session_students;
create policy "Faculty can update own attendance students"
on public.attendance_session_students
for update
to authenticated
using (
  exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id = attendance_session_students.attendance_session_id
      and exists (
        select 1
        from public.faculty
        where faculty.id = auth.uid()
          and faculty.id_number = attendance_sessions.faculty_id_number
      )
  )
)
with check (
  exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id = attendance_session_students.attendance_session_id
      and exists (
        select 1
        from public.faculty
        where faculty.id = auth.uid()
          and faculty.id_number = attendance_sessions.faculty_id_number
      )
  )
);

-- Expand get_session_students to include status (drop/recreate)
drop function if exists public.get_session_students(uuid);

create or replace function public.get_session_students(p_session_id uuid)
returns table (
  id_number bigint,
  first_name text,
  middle_name text,
  last_name text,
  course text,
  fingerprint_id text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    students.id_number,
    students.first_name,
    students.middle_name,
    students.last_name,
    students.course,
    students.fingerprint_id,
    attendance_session_students.status
  from public.attendance_session_students
  join public.students on students.id_number = attendance_session_students.student_id_number
  where attendance_session_students.attendance_session_id = p_session_id
  order by students.last_name asc;
end;
$$;

revoke all on function public.get_session_students(uuid) from public;
grant execute on function public.get_session_students(uuid) to authenticated;
