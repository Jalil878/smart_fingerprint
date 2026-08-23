-- Updates enrollment status (active/warning/drop) for a student in a session.
-- Security definer so faculty can update without RLS issues.
-- Must run after attendance-session-students-add-status.sql
drop function if exists public.update_enrollment_status(uuid, bigint, text);

create or replace function public.update_enrollment_status(
  p_session_id uuid,
  p_student_id_number bigint,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_faculty_id_number bigint;
  v_normalized text;
begin
  v_normalized := lower(trim(p_status));
  if v_normalized not in ('active','warning','drop','enrolled','dropped') then
    raise exception 'Invalid status. Allowed: active, warning, drop';
  end if;
  -- normalize dropped -> drop, enrolled -> active for consistency
  if v_normalized = 'dropped' then v_normalized := 'drop'; end if;
  if v_normalized = 'enrolled' then v_normalized := 'active'; end if;

  select faculty.id_number
  into v_faculty_id_number
  from public.faculty
  where faculty.id = auth.uid();

  if v_faculty_id_number is null then
    raise exception 'Faculty record was not found for this account.';
  end if;

  if not exists (
    select 1 from public.attendance_sessions
    where id = p_session_id and faculty_id_number = v_faculty_id_number
  ) then
    raise exception 'Session not found or not owned by faculty.';
  end if;

  if not exists (
    select 1 from public.attendance_session_students
    where attendance_session_id = p_session_id and student_id_number = p_student_id_number
  ) then
    raise exception 'Student is not enrolled in this session.';
  end if;

  update public.attendance_session_students
  set status = v_normalized
  where attendance_session_id = p_session_id
    and student_id_number = p_student_id_number;
end;
$$;

revoke all on function public.update_enrollment_status(uuid, bigint, text) from public;
grant execute on function public.update_enrollment_status(uuid, bigint, text) to authenticated;
