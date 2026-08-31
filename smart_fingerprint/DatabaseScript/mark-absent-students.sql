-- Marks every enrolled student who has no attendance record for the given day
-- as absent. Uses security definer so faculty can write records without
-- depending on RLS policy subqueries on the attendance_records table.
drop function if exists public.mark_absent_students(uuid, integer);

create or replace function public.mark_absent_students(
  p_session_id uuid,
  p_day integer
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_faculty_id_number bigint;
  v_marked bigint := 0;
begin
  select faculty.id_number
  into v_faculty_id_number
  from public.faculty
  where faculty.id = auth.uid();

  if v_faculty_id_number is null then
    raise exception 'Faculty record was not found for this account.';
  end if;

  if not exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id = p_session_id
      and attendance_sessions.faculty_id_number = v_faculty_id_number
  ) then
    raise exception 'This session does not belong to the current faculty.';
  end if;

  insert into public.attendance_records (
    day,
    attendance_session_id,
    faculty_id_number,
    student_id_number,
    status,
    date_time_attend
  )
  select
    p_day,
    p_session_id,
    v_faculty_id_number,
    attendance_session_students.student_id_number,
    'absent',
    now()
  from public.attendance_session_students
  where attendance_session_students.attendance_session_id = p_session_id
    and not exists (
      select 1
      from public.attendance_records
      where attendance_records.day = p_day
        and attendance_records.attendance_session_id = p_session_id
        and attendance_records.student_id_number = attendance_session_students.student_id_number
    )
  on conflict (day, attendance_session_id, student_id_number)
  do nothing;

  get diagnostics v_marked = row_count;
  return v_marked;
end;
$$;

revoke all on function public.mark_absent_students(uuid, integer) from public;
grant execute on function public.mark_absent_students(uuid, integer) to authenticated;