-- Allow authenticated students to self-create their own student row during registration
-- even before profile role resolution is available.

drop policy if exists students_self_insert on public.students;

create policy students_self_insert on public.students
for insert
with check (
  auth.uid() is not null
  and profile_id = auth.uid()
);
