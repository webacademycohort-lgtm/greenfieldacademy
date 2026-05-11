-- Teacher Registration System - Add pending registrations tracking
create table if not exists public.teacher_registrations (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  full_name text not null,
  phone text,
  subjects text,
  experience text,
  qualification text,
  bio text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejected_reason text,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(email)
);

-- Add approval status to staff table for tracking
alter table public.staff 
  add column if not exists registration_status text default 'active' check (registration_status in ('active','pending','rejected'));

alter table public.staff 
  add column if not exists registration_id uuid references public.teacher_registrations(id);

-- RLS for teacher_registrations (admins can see/update all, teachers can only see their own)
drop policy if exists teacher_registrations_admin_all on public.teacher_registrations;
create policy teacher_registrations_admin_all on public.teacher_registrations
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists teacher_registrations_teacher_own on public.teacher_registrations;
create policy teacher_registrations_teacher_own on public.teacher_registrations
  for select using (
    public.current_role() = 'teacher' 
    and email = (select email from public.profiles where id = auth.uid())
  );

-- Grant access
grant select, update, delete on public.teacher_registrations to authenticated;
grant insert on public.teacher_registrations to anon, authenticated;
