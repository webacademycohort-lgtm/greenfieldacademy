-- Greenfield Academy: admission + registration + status backend setup
-- Run this in Supabase SQL Editor after schema + rls.sql

-- 1) Add approval/registration fields used by admin + student registration
alter table public.pending_admissions
  add column if not exists admission_no text unique,
  add column if not exists assigned_class_id uuid references public.classes(id) on delete set null,
  add column if not exists portal_student_id text,
  add column if not exists approved_at timestamptz;

alter table public.admission_applications
  add column if not exists admission_no text unique,
  add column if not exists assigned_class_id uuid references public.classes(id) on delete set null,
  add column if not exists portal_student_id text,
  add column if not exists approved_at timestamptz;

create index if not exists idx_pending_admissions_admission_no on public.pending_admissions(admission_no);
create index if not exists idx_admission_applications_admission_no on public.admission_applications(admission_no);
create index if not exists idx_pending_admissions_reference on public.pending_admissions(id);
create index if not exists idx_admission_applications_reference on public.admission_applications(reference_number);

-- 2) Public-safe function: check admission status (for check-admission page)
create or replace function public.check_admission_status(
  p_reference_number text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_email text default null
)
returns table (
  id uuid,
  source_table text,
  full_name text,
  first_name text,
  last_name text,
  email text,
  class_applying text,
  reference_number text,
  admission_no text,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with app_union as (
    select
      a.id,
      'admission_applications'::text as source_table,
      a.full_name,
      a.first_name,
      a.last_name,
      a.email,
      a.class_applying,
      coalesce(a.reference_number, a.admission_no, a.id::text) as reference_number,
      a.admission_no,
      a.status,
      a.created_at
    from public.admission_applications a
    union all
    select
      p.id,
      'pending_admissions'::text as source_table,
      p.full_name,
      split_part(coalesce(p.full_name, ''), ' ', 1) as first_name,
      nullif(substring(coalesce(p.full_name, '') from position(' ' in coalesce(p.full_name, '')) + 1), '') as last_name,
      p.email,
      p.class_applying,
      coalesce(p.admission_no, p.id::text) as reference_number,
      p.admission_no,
      p.status,
      p.created_at
    from public.pending_admissions p
  )
  select *
  from app_union u
  where
    (
      p_reference_number is null
      or lower(coalesce(u.reference_number, '')) = lower(p_reference_number)
      or lower(coalesce(u.admission_no, '')) = lower(p_reference_number)
      or lower(u.id::text) = lower(p_reference_number)
    )
    and (p_first_name is null or lower(coalesce(u.first_name, '')) like lower('%' || p_first_name || '%'))
    and (p_last_name is null or lower(coalesce(u.last_name, '')) like lower('%' || p_last_name || '%'))
    and (p_email is null or lower(coalesce(u.email, '')) = lower(p_email))
  order by u.created_at desc
  limit 20;
$$;

grant execute on function public.check_admission_status(text, text, text, text) to anon, authenticated;

-- 3) Public-safe function: verify approved admission for student registration
create or replace function public.verify_approved_admission(
  p_admission_lookup text
)
returns table (
  id uuid,
  source_table text,
  full_name text,
  first_name text,
  last_name text,
  email text,
  class_applying text,
  date_of_birth date,
  gender text,
  guardian_name text,
  guardian_phone text,
  status text,
  admission_no text,
  assigned_class_id uuid,
  portal_student_id text,
  approved_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with app_union as (
    select
      a.id,
      'admission_applications'::text as source_table,
      a.full_name,
      a.first_name,
      a.last_name,
      a.email,
      a.class_applying,
      a.date_of_birth,
      a.gender,
      a.guardian_name,
      a.guardian_phone,
      a.status,
      a.admission_no,
      a.assigned_class_id,
      a.portal_student_id,
      a.approved_at,
      a.reference_number,
      a.created_at
    from public.admission_applications a
    union all
    select
      p.id,
      'pending_admissions'::text as source_table,
      p.full_name,
      split_part(coalesce(p.full_name, ''), ' ', 1) as first_name,
      nullif(substring(coalesce(p.full_name, '') from position(' ' in coalesce(p.full_name, '')) + 1), '') as last_name,
      p.email,
      p.class_applying,
      p.date_of_birth,
      p.gender,
      p.guardian_name,
      p.guardian_phone,
      p.status,
      p.admission_no,
      p.assigned_class_id,
      p.portal_student_id,
      p.approved_at,
      null::text as reference_number,
      p.created_at
    from public.pending_admissions p
  )
  select
    u.id, u.source_table, u.full_name, u.first_name, u.last_name, u.email, u.class_applying,
    u.date_of_birth, u.gender, u.guardian_name, u.guardian_phone, u.status, u.admission_no,
    u.assigned_class_id, u.portal_student_id, u.approved_at
  from app_union u
  where u.status = 'approved'
    and (
      lower(coalesce(u.admission_no, '')) = lower(p_admission_lookup)
      or lower(coalesce(u.reference_number, '')) = lower(p_admission_lookup)
      or lower(u.id::text) = lower(p_admission_lookup)
    )
  order by u.created_at desc
  limit 1;
$$;

grant execute on function public.verify_approved_admission(text) to anon, authenticated;

-- 4) Public-safe function: verify approved admission by email (for portal self-link recovery)
create or replace function public.verify_approved_admission_by_email(
  p_email text
)
returns table (
  id uuid,
  source_table text,
  full_name text,
  first_name text,
  last_name text,
  email text,
  class_applying text,
  date_of_birth date,
  gender text,
  guardian_name text,
  guardian_phone text,
  status text,
  admission_no text,
  assigned_class_id uuid,
  portal_student_id text,
  approved_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with app_union as (
    select
      a.id,
      'admission_applications'::text as source_table,
      a.full_name,
      a.first_name,
      a.last_name,
      a.email,
      a.class_applying,
      a.date_of_birth,
      a.gender,
      a.guardian_name,
      a.guardian_phone,
      a.status,
      a.admission_no,
      a.assigned_class_id,
      a.portal_student_id,
      a.approved_at,
      a.created_at
    from public.admission_applications a
    union all
    select
      p.id,
      'pending_admissions'::text as source_table,
      p.full_name,
      split_part(coalesce(p.full_name, ''), ' ', 1) as first_name,
      nullif(substring(coalesce(p.full_name, '') from position(' ' in coalesce(p.full_name, '')) + 1), '') as last_name,
      p.email,
      p.class_applying,
      p.date_of_birth,
      p.gender,
      p.guardian_name,
      p.guardian_phone,
      p.status,
      p.admission_no,
      p.assigned_class_id,
      p.portal_student_id,
      p.approved_at,
      p.created_at
    from public.pending_admissions p
  )
  select
    u.id, u.source_table, u.full_name, u.first_name, u.last_name, u.email, u.class_applying,
    u.date_of_birth, u.gender, u.guardian_name, u.guardian_phone, u.status, u.admission_no,
    u.assigned_class_id, u.portal_student_id, u.approved_at
  from app_union u
  where u.status = 'approved'
    and lower(coalesce(u.email, '')) = lower(coalesce(p_email, ''))
  order by u.created_at desc
  limit 1;
$$;

grant execute on function public.verify_approved_admission_by_email(text) to anon, authenticated;
