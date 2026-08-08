-- Inserts an attendance record for a student marked present via the
-- fingerprint scanner. Security definer so faculty can write records
-- without depending on RLS policy subqueries on the attendance_records table.
drop function if exists public.record_attendance(uuid, integer, bigint);

create or replace function public.record_attendance(
  p_session_id uuid,
  p_day integer,
  p_student_id_number bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_faculty_id_number bigint;
  v_is_enrolled boolean;
begin
  select faculty.id_number
  into v_faculty_id_number
  from public.faculty
  where faculty.id = auth.uid();

  if v_faculty_id_number is null then
    raise exception 'Faculty record was not found for this account.';
  end if;

  select exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id = p_session_id
      and attendance_sessions.faculty_id_number = v_faculty_id_number
  )
  into v_is_enrolled;

  if not v_is_enrolled then
    raise exception 'This session does not belong to the current faculty.';
  end if;

  select exists (
    select 1
    from public.attendance_session_students
    where attendance_session_id = p_session_id
      and student_id_number = p_student_id_number
  )
  into v_is_enrolled;

  if not v_is_enrolled then
    raise exception 'Student is not enrolled in this session.';
  end if;

  insert into public.attendance_records (
    day,
    attendance_session_id,
    faculty_id_number,
    student_id_number,
    status,
    date_time_attend
  )
  values (
    p_day,
    p_session_id,
    v_faculty_id_number,
    p_student_id_number,
    'present',
    now()
  )
  on conflict (day, attendance_session_id, student_id_number)
  do nothing;
end;
$$;

revoke all on function public.record_attendance(uuid, integer, bigint) from public;
grant execute on function public.record_attendance(uuid, integer, bigint) to authenticated;
