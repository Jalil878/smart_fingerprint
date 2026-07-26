create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  day integer not null,
  attendance_session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  faculty_id_number bigint not null references public.faculty(id_number) on delete cascade,
  student_id_number bigint not null references public.students(id_number) on delete cascade,
  status text not null check (status in ('present', 'late', 'absent')),
  date_time_attend timestamp with time zone default now(),
  unique (day, attendance_session_id, student_id_number)
);

alter table public.attendance_records enable row level security;

grant select, insert, update, delete on public.attendance_records to authenticated;

drop policy if exists "Faculty can read own attendance records" on public.attendance_records;
create policy "Faculty can read own attendance records"
on public.attendance_records
for select
to authenticated
using (
  exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id = attendance_records.attendance_session_id
      and exists (
        select 1
        from public.faculty
        where faculty.id = auth.uid()
          and faculty.id_number = attendance_sessions.faculty_id_number
      )
  )
);

drop policy if exists "Faculty can insert own attendance records" on public.attendance_records;
create policy "Faculty can insert own attendance records"
on public.attendance_records
for insert
to authenticated
with check (
  exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id = attendance_records.attendance_session_id
      and exists (
        select 1
        from public.faculty
        where faculty.id = auth.uid()
          and faculty.id_number = attendance_sessions.faculty_id_number
      )
  )
);

drop policy if exists "Faculty can update own attendance records" on public.attendance_records;
create policy "Faculty can update own attendance records"
on public.attendance_records
for update
to authenticated
using (
  exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id = attendance_records.attendance_session_id
      and exists (
        select 1
        from public.faculty
        where faculty.id = auth.uid()
          and faculty.id_number = attendance_sessions.faculty_id_number
      )
  )
)
with check (
  exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id = attendance_records.attendance_session_id
      and exists (
        select 1
        from public.faculty
        where faculty.id = auth.uid()
          and faculty.id_number = attendance_sessions.faculty_id_number
      )
  )
);

drop policy if exists "Admins can read attendance records" on public.attendance_records;
create policy "Admins can read attendance records"
on public.attendance_records
for select
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);
