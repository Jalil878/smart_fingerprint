-- Returns per-day present/late/absent totals for a session.
-- Security definer so faculty can read totals without RLS subquery policies.
drop function if exists public.get_session_day_totals(uuid);

create or replace function public.get_session_day_totals(p_session_id uuid)
returns table (
  day integer,
  present bigint,
  late bigint,
  absent bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    attendance_records.day,
    count(*) filter (where attendance_records.status = 'present')::bigint as present,
    count(*) filter (where attendance_records.status = 'late')::bigint as late,
    count(*) filter (where attendance_records.status = 'absent')::bigint as absent
  from public.attendance_records
  where attendance_records.attendance_session_id = p_session_id
  group by attendance_records.day
  order by attendance_records.day;
end;
$$;

revoke all on function public.get_session_day_totals(uuid) from public;
grant execute on function public.get_session_day_totals(uuid) to authenticated;