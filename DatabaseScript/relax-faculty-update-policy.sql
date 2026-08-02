drop policy if exists "Admins can update faculty" on public.faculty;

create policy "Authenticated users can update faculty"
on public.faculty
for update
to authenticated
using (true)
with check (true);
