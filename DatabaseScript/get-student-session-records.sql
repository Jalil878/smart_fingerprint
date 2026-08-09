-- Returns the current student's attendance records for one session,
-- grouped by day. Uses security definer so students can view their own
-- per-day attendance without extra RLS policies.
drop function if exists public.get_student_session_records(uuid);

create or replace function public.get_student_session_records(p_session_id uuid)
returns table (
  day integer,
  status text,
  date_time_attend timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id_number bigint;
begin
  select students.id_number
  into v_student_id_number
  from public.students
  where students.id = auth.uid();

  if v_student_id_number is null then
    raise exception 'Student record was not found for this account.';
  end if;

  return query
  select
    attendance_records.day,
    attendance_records.status,
    attendance_records.date_time_attend
  from public.attendance_records
  where attendance_records.attendance_session_id = p_session_id
    and attendance_records.student_id_number = v_student_id_number
  order by attendance_records.day asc;
end;
$$;

revoke all on function public.get_student_session_records(uuid) from public;
grant execute on function public.get_student_session_records(uuid) to authenticated;