create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  faculty_id_number bigint not null references public.faculty(id_number) on delete cascade,
  subject_name text not null,
  section text not null,
  attendance_time time not null,
  room text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.attendance_session_students (
  id uuid primary key default gen_random_uuid(),
  attendance_session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id_number bigint not null references public.students(id_number) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (attendance_session_id, student_id_number)
);

alter table public.attendance_sessions enable row level security;
alter table public.attendance_session_students enable row level security;

grant select, insert, update, delete on public.attendance_sessions to authenticated;
grant select, insert, delete on public.attendance_session_students to authenticated;

drop policy if exists "Faculty can read own attendance sessions" on public.attendance_sessions;
create policy "Faculty can read own attendance sessions"
on public.attendance_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.faculty
    where faculty.id = auth.uid()
      and faculty.id_number = attendance_sessions.faculty_id_number
  )
);

drop policy if exists "Faculty can create own attendance sessions" on public.attendance_sessions;
create policy "Faculty can create own attendance sessions"
on public.attendance_sessions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.faculty
    where faculty.id = auth.uid()
      and faculty.id_number = attendance_sessions.faculty_id_number
  )
);

drop policy if exists "Faculty can update own attendance sessions" on public.attendance_sessions;
create policy "Faculty can update own attendance sessions"
on public.attendance_sessions
for update
to authenticated
using (
  exists (
    select 1
    from public.faculty
    where faculty.id = auth.uid()
      and faculty.id_number = attendance_sessions.faculty_id_number
  )
)
with check (
  exists (
    select 1
    from public.faculty
    where faculty.id = auth.uid()
      and faculty.id_number = attendance_sessions.faculty_id_number
  )
);

drop policy if exists "Faculty can delete own attendance sessions" on public.attendance_sessions;
create policy "Faculty can delete own attendance sessions"
on public.attendance_sessions
for delete
to authenticated
using (
  exists (
    select 1
    from public.faculty
    where faculty.id = auth.uid()
      and faculty.id_number = attendance_sessions.faculty_id_number
  )
);

drop policy if exists "Faculty can read own attendance students" on public.attendance_session_students;
create policy "Faculty can read own attendance students"
on public.attendance_session_students
for select
to authenticated
using (
  exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id = attendance_session_students.attendance_session_id
      and exists (
        select 1
        from public.faculty
        where faculty.id = auth.uid()
          and faculty.id_number = attendance_sessions.faculty_id_number
      )
  )
);

drop policy if exists "Faculty can add students to own attendance" on public.attendance_session_students;
create policy "Faculty can add students to own attendance"
on public.attendance_session_students
for insert
to authenticated
with check (
  exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id = attendance_session_students.attendance_session_id
      and exists (
        select 1
        from public.faculty
        where faculty.id = auth.uid()
          and faculty.id_number = attendance_sessions.faculty_id_number
      )
  )
  and exists (
    select 1
    from public.students
    where students.id_number = attendance_session_students.student_id_number
  )
);

drop policy if exists "Faculty can remove students from own attendance" on public.attendance_session_students;
create policy "Faculty can remove students from own attendance"
on public.attendance_session_students
for delete
to authenticated
using (
  exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id = attendance_session_students.attendance_session_id
      and exists (
        select 1
        from public.faculty
        where faculty.id = auth.uid()
          and faculty.id_number = attendance_sessions.faculty_id_number
      )
  )
);

drop policy if exists "Admins can read attendance sessions" on public.attendance_sessions;
create policy "Admins can read attendance sessions"
on public.attendance_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);

drop policy if exists "Admins can read attendance students" on public.attendance_session_students;
create policy "Admins can read attendance students"
on public.attendance_session_students
for select
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.email = auth.jwt() ->> 'email'
  )
);

create or replace function public.create_attendance(
  p_subject_name text,
  p_section text,
  p_attendance_time time,
  p_room text,
  p_student_id_numbers bigint[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_faculty_id_number bigint;
  v_attendance_session_id uuid;
begin
  select faculty.id_number
  into v_faculty_id_number
  from public.faculty
  where faculty.id = auth.uid();

  if v_faculty_id_number is null then
    raise exception 'Faculty record was not found for this account.';
  end if;

  if p_student_id_numbers is null or array_length(p_student_id_numbers, 1) is null then
    raise exception 'Please select at least one student.';
  end if;

  insert into public.attendance_sessions (
    faculty_id_number,
    subject_name,
    section,
    attendance_time,
    room
  )
  values (
    v_faculty_id_number,
    p_subject_name,
    p_section,
    p_attendance_time,
    p_room
  )
  returning id into v_attendance_session_id;

  insert into public.attendance_session_students (
    attendance_session_id,
    student_id_number
  )
  select v_attendance_session_id, selected_student_id_number
  from unnest(p_student_id_numbers) as selected_student_id_number
  where exists (
    select 1
    from public.students
    where students.id_number = selected_student_id_number
  );

  if not exists (
    select 1
    from public.attendance_session_students
    where attendance_session_id = v_attendance_session_id
  ) then
    raise exception 'Selected students were not found.';
  end if;

  return v_attendance_session_id;
end;
$$;

revoke all on function public.create_attendance(text, text, time, text, bigint[]) from public;
grant execute on function public.create_attendance(text, text, time, text, bigint[]) to authenticated;

create or replace function public.get_my_attendance_sessions()
returns table (
  id uuid,
  subject_name text,
  section text,
  attendance_time time,
  room text,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_faculty_id_number bigint;
begin
  select faculty.id_number
  into v_faculty_id_number
  from public.faculty
  where faculty.id = auth.uid();

  if v_faculty_id_number is null then
    raise exception 'Faculty record was not found for this account.';
  end if;

  return query
  select
    attendance_sessions.id,
    attendance_sessions.subject_name,
    attendance_sessions.section,
    attendance_sessions.attendance_time,
    attendance_sessions.room,
    attendance_sessions.created_at
  from public.attendance_sessions
  where attendance_sessions.faculty_id_number = v_faculty_id_number
  order by attendance_sessions.created_at desc;
end;
$$;

revoke all on function public.get_my_attendance_sessions() from public;
grant execute on function public.get_my_attendance_sessions() to authenticated;
