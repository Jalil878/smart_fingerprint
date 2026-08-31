-- Sends a notification to a student when a faculty updates enrollment status.
-- Security definer so faculty can insert notification rows without depending on
-- table-level RLS insert policies.
drop function if exists public.notify_enrollment_status_change(bigint, text, text);

create or replace function public.notify_enrollment_status_change(
  p_student_id_number bigint,
  p_title text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_faculty_id_number bigint;
begin
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Notification title is required.';
  end if;

  if p_message is null or length(trim(p_message)) = 0 then
    raise exception 'Notification message is required.';
  end if;

  select faculty.id_number
  into v_faculty_id_number
  from public.faculty
  where faculty.id = auth.uid();

  if v_faculty_id_number is null then
    raise exception 'Faculty record was not found for this account.';
  end if;

  if not exists (
    select 1
    from public.students
    where students.id_number = p_student_id_number
  ) then
    raise exception 'Student record not found.';
  end if;

  insert into public.notifications (student_id_number, title, message)
  values (p_student_id_number, trim(p_title), trim(p_message));
end;
$$;

revoke all on function public.notify_enrollment_status_change(bigint, text, text) from public;
grant execute on function public.notify_enrollment_status_change(bigint, text, text) to authenticated;
