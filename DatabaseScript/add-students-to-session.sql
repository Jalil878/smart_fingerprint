-- Adds students to an existing attendance session.
-- Uses security definer so faculty can add students to their own sessions
-- without extra RLS policies on the join, and ignores students already enrolled.
drop function if exists public.add_students_to_session(uuid, bigint[]);

create or replace function public.add_students_to_session(
  p_session_id uuid,
  p_student_id_numbers bigint[]
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_faculty_id_number bigint;
  v_added bigint := 0;
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
    raise exception 'Attendance session was not found for this account.';
  end if;

  insert into public.attendance_session_students (
    attendance_session_id,
    student_id_number
  )
  select p_session_id, selected_student.id_number
  from unnest(p_student_id_numbers) as selected_student(id_number)
  where exists (
    select 1
    from public.students
    where students.id_number = selected_student.id_number
  )
  on conflict (attendance_session_id, student_id_number) do nothing;

  get diagnostics v_added = row_count;
  return v_added;
end;
$$;

revoke all on function public.add_students_to_session(uuid, bigint[]) from public;
grant execute on function public.add_students_to_session(uuid, bigint[]) to authenticated;