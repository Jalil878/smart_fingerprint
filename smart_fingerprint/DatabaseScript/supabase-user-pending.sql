create table if not exists public.user_pending (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('faculty', 'student')),
  first_name text not null,
  middle_name text,
  last_name text not null,
  id_number text not null,
  course text,
  email text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.user_pending enable row level security;

create policy "Users can read their own pending account"
on public.user_pending
for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert their own pending account"
on public.user_pending
for insert
to authenticated
with check (auth.uid() = id);

create policy "Admins can read pending accounts"
on public.user_pending
for select
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);

create policy "Admins can update pending accounts"
on public.user_pending
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

create policy "Admins can delete pending accounts"
on public.user_pending
for delete
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);
