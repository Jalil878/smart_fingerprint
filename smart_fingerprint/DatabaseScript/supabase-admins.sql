create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'admin',
  created_at timestamp with time zone default now()
);

alter table public.admins enable row level security;

create policy "Admins can read their own admin record"
on public.admins
for select
to authenticated
using (email = auth.jwt() ->> 'email');
