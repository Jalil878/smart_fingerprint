create table if not exists public.fingerprint_device (
  id uuid primary key default gen_random_uuid(),
  device_name text not null,
  device_url text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.fingerprint_device enable row level security;

create policy "Admins can read fingerprint devices"
on public.fingerprint_device
for select
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);

create policy "Admins can insert fingerprint devices"
on public.fingerprint_device
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);

create policy "Admins can update fingerprint devices"
on public.fingerprint_device
for update
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
)
with check (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);

create policy "Admins can delete fingerprint devices"
on public.fingerprint_device
for delete
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);
