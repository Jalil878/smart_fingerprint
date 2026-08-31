-- Restores a dropped student to active status for a specific session.
-- Security definer so admin can restore regardless of faculty-only RLS policies.
drop function if exists public.restore_dropped_student_by_admin(uuid, bigint);

create or replace function public.restore_dropped_student_by_admin(
  p_session_id uuid,
  p_student_id_number bigint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_rows_updated integer;
begin
  select exists (
    select 1
    from public.admins
    where admins.id = auth.uid()
  )
  into v_is_admin;

  if not v_is_admin then
    raise exception 'Only admins can restore dropped students.';
  end if;

  update public.attendance_session_students
  set status = 'active'
  where attendance_session_id = p_session_id
    and student_id_number = p_student_id_number
    and lower(coalesce(status, '')) in ('drop', 'dropped');

  get diagnostics v_rows_updated = row_count;
  return v_rows_updated > 0;
end;
$$;

revoke all on function public.restore_dropped_student_by_admin(uuid, bigint) from public;
grant execute on function public.restore_dropped_student_by_admin(uuid, bigint) to authenticated;
