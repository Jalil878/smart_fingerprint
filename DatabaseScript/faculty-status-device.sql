alter table public.faculty
add column if not exists status_device text default 'offline';
