-- Updates the current faculty's profile in their faculty record.
-- Uses security definer so faculty can edit their own profile reliably.
drop function if exists public.update_faculty_profile(text, text, text, text);

create or replace function public.update_faculty_profile(
  p_first_name text,
  p_middle_name text,
  p_last_name text,
  p_id_number text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.faculty
  set
    first_name = p_first_name,
    middle_name = p_middle_name,
    last_name = p_last_name,
    id_number = p_id_number::bigint,
    updated_at = now()
  where faculty.id = auth.uid();

  if not found then
    raise exception 'Faculty record was not found for this account.';
  end if;
end;
$$;

revoke all on function public.update_faculty_profile(text, text, text, text) from public;
grant execute on function public.update_faculty_profile(text, text, text, text) to authenticated;