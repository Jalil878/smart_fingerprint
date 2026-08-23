-- Returns the sessions (classes) the current student is enrolled in
-- together with their latest attendance status. Uses security definer so
-- students can list their own enrolled classes without extra RLS policies.
drop function if exists public.get_my_classes();

create or replace function public.get_my_classes()
returns table (
  id uuid,
  subject_name text,
  section text,
  attendance_time time,
  room text,
  created_at timestamp with time zone,
  day integer,
  status text,
  enrollment_status text
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
    attendance_sessions.id,
    attendance_sessions.subject_name,
    attendance_sessions.section,
    attendance_sessions.attendance_time,
    attendance_sessions.room,
    attendance_sessions.created_at,
    coalesce(latest_record.day, 0)::integer as day,
    coalesce(latest_record.status, 'absent')::text as status,
    coalesce(attendance_session_students.status, 'active')::text as enrollment_status
  from public.attendance_session_students
  join public.attendance_sessions
    on attendance_sessions.id = attendance_session_students.attendance_session_id
  left join lateral (
    select attendance_records.day, attendance_records.status
    from public.attendance_records
    where attendance_records.attendance_session_id = attendance_sessions.id
      and attendance_records.student_id_number = v_student_id_number
    order by attendance_records.day desc
    limit 1
  ) latest_record on true
  where attendance_session_students.student_id_number = v_student_id_number
  order by attendance_sessions.created_at desc;
end;
$$;

revoke all on function public.get_my_classes() from public;
grant execute on function public.get_my_classes() to authenticated;