-- Public-safe lookup for approved admission by email.
-- SECURITY DEFINER bypasses table RLS while returning only approved row subset.
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
