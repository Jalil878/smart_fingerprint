-- Returns attendance records for a session on a given day, joined with the
-- student details. Security definer so faculty can read records without
-- depending on RLS policy subqueries on the attendance_records table.
drop function if exists public.get_day_attendance_records(uuid, integer);

create or replace function public.get_day_attendance_records(
  p_session_id uuid,
  p_day integer
)
returns table (
  id uuid,
  day integer,
  attendance_session_id uuid,
  faculty_id_number bigint,
  student_id_number bigint,
  status text,
  date_time_attend timestamp with time zone,
  first_name text,
  middle_name text,
  last_name text,
  course text,
  fingerprint_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    attendance_records.id,
    attendance_records.day,
    attendance_records.attendance_session_id,
    attendance_records.faculty_id_number,
    attendance_records.student_id_number,
    attendance_records.status,
    attendance_records.date_time_attend,
    students.first_name,
    students.middle_name,
    students.last_name,
    students.course,
    students.fingerprint_id
  from public.attendance_records
  join public.students on students.id_number = attendance_records.student_id_number
  where attendance_records.attendance_session_id = p_session_id
    and attendance_records.day = p_day
  order by students.last_name asc;
end;
$$;

revoke all on function public.get_day_attendance_records(uuid, integer) from public;
grant execute on function public.get_day_attendance_records(uuid, integer) to authenticated;
