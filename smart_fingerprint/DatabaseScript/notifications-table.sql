create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id_number bigint not null references public.students(id_number) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamp with time zone default now()
);

alter table public.notifications enable row level security;

grant select, insert, update, delete on public.notifications to authenticated;

drop policy if exists "Students can read own notifications" on public.notifications;
create policy "Students can read own notifications"
on public.notifications
for select
to authenticated
using (
  exists (
    select 1
    from public.students
    where students.id = auth.uid()
      and students.id_number = notifications.student_id_number
  )
);

drop policy if exists "Students can update own notifications" on public.notifications;
create policy "Students can update own notifications"
on public.notifications
for update
to authenticated
using (
  exists (
    select 1
    from public.students
    where students.id = auth.uid()
      and students.id_number = notifications.student_id_number
  )
)
with check (
  exists (
    select 1
    from public.students
    where students.id = auth.uid()
      and students.id_number = notifications.student_id_number
  )
);

create or replace function public.get_my_notifications()
returns table (
  id uuid,
  title text,
  message text,
  is_read boolean,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id_number bigint;
begin
  select students.id_number
  into v_student_id_number
  from public.students
  where students.id = auth.uid();

  if v_student_id_number is null then
    raise exception 'Student record was not found for this account.';
  end if;

  return query
  select
    notifications.id,
    notifications.title,
    notifications.message,
    notifications.is_read,
    notifications.created_at
  from public.notifications
  where notifications.student_id_number = v_student_id_number
  order by notifications.created_at desc;
end;
$$;

revoke all on function public.get_my_notifications() from public;
grant execute on function public.get_my_notifications() to authenticated;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id_number bigint;
begin
  select students.id_number
  into v_student_id_number
  from public.students
  where students.id = auth.uid();

  if v_student_id_number is null then
    raise exception 'Student record was not found for this account.';
  end if;

  update public.notifications
  set is_read = true
  where notifications.id = p_notification_id
    and notifications.student_id_number = v_student_id_number;
end;
$$;

revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;