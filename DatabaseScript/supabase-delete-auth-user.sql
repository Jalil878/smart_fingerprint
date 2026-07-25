create or replace function public.delete_app_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  ) then
    raise exception 'Only admins can delete users.';
  end if;

  delete from auth.users
  where id = target_user_id;

  if not found then
    raise exception 'User was not found in Authentication.';
  end if;
end;
$$;

revoke all on function public.delete_app_user(uuid) from public;
grant execute on function public.delete_app_user(uuid) to authenticated;
