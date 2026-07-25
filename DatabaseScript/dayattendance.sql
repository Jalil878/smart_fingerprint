create table if not exists public.dayattendance (
  id uuid primary key default gen_random_uuid(),
  day integer not null,
  attendance_session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  faculty_id_number bigint not null references public.faculty(id_number) on delete cascade,
  created_at timestamp with time zone default now()
);

alter table public.dayattendance enable row level security;

grant select, insert, delete on public.dayattendance to authenticated;

drop policy if exists "Faculty can read own dayattendance" on public.dayattendance;
create policy "Faculty can read own dayattendance"
on public.dayattendance
for select
to authenticated
using (
  exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id = dayattendance.attendance_session_id
      and exists (
        select 1
        from public.faculty
        where faculty.id = auth.uid()
          and faculty.id_number = attendance_sessions.faculty_id_number
      )
  )
);

drop policy if exists "Faculty can insert own dayattendance" on public.dayattendance;
create policy "Faculty can insert own dayattendance"
on public.dayattendance
for insert
to authenticated
with check (
  exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id = dayattendance.attendance_session_id
      and exists (
        select 1
        from public.faculty
        where faculty.id = auth.uid()
          and faculty.id_number = attendance_sessions.faculty_id_number
      )
  )
);

drop policy if exists "Admins can read dayattendance" on public.dayattendance;
create policy "Admins can read dayattendance"
on public.dayattendance
for select
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);

create or replace function public.add_day_to_session(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_faculty_id_number bigint;
  v_next_day integer;
begin
  select faculty.id_number
  into v_faculty_id_number
  from public.faculty
  where faculty.id = auth.uid();

  if v_faculty_id_number is null then
    raise exception 'Faculty record was not found for this account.';
  end if;

  select coalesce(max(day), 0) + 1
  into v_next_day
  from public.dayattendance
  where attendance_session_id = p_session_id;

  insert into public.dayattendance (day, attendance_session_id, faculty_id_number)
  values (v_next_day, p_session_id, v_faculty_id_number);

  if not exists (
    select 1 from public.dayattendance
    where attendance_session_id = p_session_id and day = v_next_day
  ) then
    raise exception 'No students found for this session.';
  end if;

  return v_next_day;
end;
$$;

revoke all on function public.add_day_to_session(uuid) from public;
grant execute on function public.add_day_to_session(uuid) to authenticated;

create or replace function public.get_session_days(p_session_id uuid)
returns table (day integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select distinct dayattendance.day
  from public.dayattendance
  where dayattendance.attendance_session_id = p_session_id
  order by dayattendance.day;
end;
$$;

revoke all on function public.get_session_days(uuid) from public;
grant execute on function public.get_session_days(uuid) to authenticated;
