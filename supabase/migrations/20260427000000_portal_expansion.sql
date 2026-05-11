-- Portal expansion: admissions, notifications, broadcasts, student profile extras

create extension if not exists "uuid-ossp";

create table if not exists public.admission_applications (
  id uuid primary key default uuid_generate_v4(),
  first_name text,
  middle_name text,
  last_name text,
  full_name text not null,
  email text,
  date_of_birth date,
  gender text,
  class_applying text,
  previous_school text,
  passport_photo_url text,
  guardian_name text,
  guardian_phone text,
  country text,
  state text,
  lga text,
  street_address text,
  reference_number text unique,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.parent_notifications (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid,
  student_id uuid references public.students(id) on delete set null,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  channel text not null default 'portal' check (channel in ('portal','sms','email','whatsapp')),
  subject text,
  message text not null,
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.broadcast_messages (
  id uuid primary key default uuid_generate_v4(),
  audience text not null default 'all' check (audience in ('all','students','teachers')),
  title text not null,
  message text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.students add column if not exists portal_student_id text unique;
alter table public.students add column if not exists admitted_at timestamptz;
alter table public.students add column if not exists school_name text default 'Greenfield Academy';
alter table public.students add column if not exists current_term text;
alter table public.students add column if not exists current_session text;
alter table public.students add column if not exists class_fee numeric(12,2);

insert into storage.buckets (id, name, public)
values ('student-passports', 'student-passports', true)
on conflict (id) do nothing;

alter table public.admission_applications enable row level security;
alter table public.parent_notifications enable row level security;
alter table public.broadcast_messages enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on public.admission_applications to anon, authenticated;
grant insert on public.pending_admissions to anon, authenticated;

drop policy if exists admission_apps_public_insert on public.admission_applications;
create policy admission_apps_public_insert on public.admission_applications
for insert with check (true);

drop policy if exists pending_public_insert on public.pending_admissions;
create policy pending_public_insert on public.pending_admissions
for insert with check (true);

drop policy if exists admission_apps_admin_select on public.admission_applications;
create policy admission_apps_admin_select on public.admission_applications
for select using (public.current_role() = 'admin');

drop policy if exists admission_apps_admin_update on public.admission_applications;
create policy admission_apps_admin_update on public.admission_applications
for update using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists parent_notifications_admin_all on public.parent_notifications;
create policy parent_notifications_admin_all on public.parent_notifications
for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists broadcast_admin_insert on public.broadcast_messages;
create policy broadcast_admin_insert on public.broadcast_messages
for insert with check (public.current_role() = 'admin');

drop policy if exists broadcast_audience_read on public.broadcast_messages;
create policy broadcast_audience_read on public.broadcast_messages
for select using (
  public.current_role() = 'admin'
  or audience = 'all'
  or (audience = 'students' and public.current_role() = 'student')
  or (audience = 'teachers' and public.current_role() = 'teacher')
);
