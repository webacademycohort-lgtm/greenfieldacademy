-- Fix student self-registration RLS and table grants

alter table public.students enable row level security;
alter table public.payments enable row level security;

drop policy if exists students_self_insert on public.students;
create policy students_self_insert on public.students
for insert with check (
  auth.uid() is not null
  and profile_id = auth.uid()
);

drop policy if exists students_self_update on public.students;
create policy students_self_update on public.students
for update using (
  profile_id = auth.uid()
) with check (
  profile_id = auth.uid()
);

grant select, insert, update on public.students to authenticated;
grant select, insert, update on public.payments to authenticated;
