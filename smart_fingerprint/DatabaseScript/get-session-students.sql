-- Returns the list of students enrolled in an attendance session
-- with their fingerprint enrollment status. Uses security definer so
-- faculty can read it without extra RLS policies on the join.
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
