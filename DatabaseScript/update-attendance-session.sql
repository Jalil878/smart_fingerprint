-- Updates an attendance session owned by the current faculty.
-- Uses security definer so faculty can edit their own sessions reliably.
drop function if exists public.update_attendance_session(uuid, text, text, time, text);
drop function if exists public.update_attendance_session(uuid, text, text, text, text, text, time, text);

create or replace function public.update_attendance_session(
  p_session_id uuid,
  p_subject_name text,
  p_section text,
  p_course_code text,
  p_semester text,
  p_academic_year text,
  p_attendance_time time,
  p_room text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_faculty_id_number bigint;
begin
  select faculty.id_number
  into v_faculty_id_number
  from public.faculty
  where faculty.id = auth.uid();

  if v_faculty_id_number is null then
    raise exception 'Faculty record was not found for this account.';
  end if;

  update public.attendance_sessions
  set
    subject_name = p_subject_name,
    section = p_section,
    course_code = p_course_code,
    semester = p_semester,
    academic_year = p_academic_year,
    attendance_time = p_attendance_time,
    room = p_room,
    updated_at = now()
  where attendance_sessions.id = p_session_id
    and attendance_sessions.faculty_id_number = v_faculty_id_number;

  if not found then
    raise exception 'This session does not belong to the current faculty.';
  end if;
end;
$$;

revoke all on function public.update_attendance_session(uuid, text, text, text, text, text, time, text) from public;
grant execute on function public.update_attendance_session(uuid, text, text, text, text, text, time, text) to authenticated;
