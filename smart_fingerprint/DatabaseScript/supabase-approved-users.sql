create table if not exists public.faculty (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  middle_name text,
  last_name text not null,
  id_number text not null unique,
  email text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  middle_name text,
  last_name text not null,
  id_number text not null unique,
  course text not null,
  email text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.faculty enable row level security;
alter table public.students enable row level security;

create policy "Admins can read faculty"
on public.faculty
for select
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);

create policy "Admins can insert faculty"
on public.faculty
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);

create policy "Admins can update faculty"
on public.faculty
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

create policy "Admins can delete faculty"
on public.faculty
for delete
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);

create policy "Faculty can read their own record"
on public.faculty
for select
to authenticated
using (auth.uid() = id);

create policy "Admins can read students"
on public.students
for select
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);

create policy "Admins can insert students"
on public.students
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);

create policy "Admins can update students"
on public.students
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

create policy "Admins can delete students"
on public.students
for delete
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);

create policy "Students can read their own record"
on public.students
for select
to authenticated
using (auth.uid() = id);

create policy "Faculty can read students"
on public.students
for select
to authenticated
using (
  exists (
    select 1
    from public.faculty
    where faculty.id = auth.uid()
  )
);
