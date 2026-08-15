create or replace function public.get_fingerprint_device()
returns table (
  id uuid,
  device_name text,
  device_url text
)
language sql
security definer
set search_path = public
as $$
  select d.id, d.device_name, d.device_url
  from public.fingerprint_device d
  limit 1;
$$;

revoke execute on function public.get_fingerprint_device() from public;
grant execute on function public.get_fingerprint_device() to authenticated;
