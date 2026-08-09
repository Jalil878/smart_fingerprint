-- Updates the current student's profile in their own students record.
-- Uses security definer so students can edit their own profile reliably.
drop function if exists public.update_student_profile(text, text, text, text, text);

create or replace function public.update_student_profile(
  p_first_name text,
  p_middle_name text,
  p_last_name text,
  p_id_number text,
  p_course text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.students
  set
    first_name = p_first_name,
    middle_name = p_middle_name,
    last_name = p_last_name,
    id_number = p_id_number::bigint,
    course = p_course,
    updated_at = now()
  where students.id = auth.uid();

  if not found then
    raise exception 'Student record was not found for this account.';
  end if;
end;
$$;

revoke all on function public.update_student_profile(text, text, text, text, text) from public;
grant execute on function public.update_student_profile(text, text, text, text, text) to authenticated;