-- Greenfield Academy portal schema (matches js/*.js frontend queries)
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key,
  email text unique not null,
  full_name text not null,
  role text not null default 'student' check (role in ('admin','teacher','student')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.classes (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  level text not null check (level in ('JSS','SSS')),
  teacher_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.subjects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.staff (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid unique references public.profiles(id) on delete cascade not null,
  full_name text not null,
  email text,
  phone text,
  subject_ids uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.students (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid unique references public.profiles(id) on delete cascade not null,
  admission_no text unique not null,
  class_id uuid references public.classes(id),
  prefect_title text,
  date_of_birth date,
  gender text check (gender in ('M','F')),
  guardian_name text,
  guardian_phone text,
  status text not null default 'active' check (status in ('active','inactive','graduated','suspended')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.results (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  term text not null check (term in ('1st Term','2nd Term','3rd Term')),
  session text not null,
  ca_score numeric(5,2) default 0 check (ca_score between 0 and 40),
  exam_score numeric(5,2) default 0 check (exam_score between 0 and 60),
  total numeric(5,2) default 0,
  grade text,
  remark text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (student_id, subject_id, term, session)
);

create or replace function public.calc_result_fields()
returns trigger language plpgsql as $$
declare
  t numeric;
begin
  t := coalesce(new.ca_score, 0) + coalesce(new.exam_score, 0);
  new.total := t;
  if t >= 75 then new.grade := 'A1'; new.remark := 'Excellent';
  elsif t >= 70 then new.grade := 'B2'; new.remark := 'Very Good';
  elsif t >= 65 then new.grade := 'B3'; new.remark := 'Good';
  elsif t >= 60 then new.grade := 'C4'; new.remark := 'Credit';
  elsif t >= 55 then new.grade := 'C5'; new.remark := 'Credit';
  elsif t >= 50 then new.grade := 'C6'; new.remark := 'Credit';
  elsif t >= 45 then new.grade := 'D7'; new.remark := 'Pass';
  elsif t >= 40 then new.grade := 'E8'; new.remark := 'Pass';
  else new.grade := 'F9'; new.remark := 'Fail';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_calc_result_fields on public.results;
create trigger trg_calc_result_fields
before insert or update of ca_score, exam_score on public.results
for each row execute function public.calc_result_fields();

create table if not exists public.assignments (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  class_id uuid references public.classes(id),
  subject_id uuid references public.subjects(id),
  term text not null check (term in ('1st Term','2nd Term','3rd Term')),
  session text not null,
  due_date date,
  file_url text,
  uploaded_by uuid references public.staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete cascade not null,
  amount numeric(12,2) not null default 0,
  term text not null check (term in ('1st Term','2nd Term','3rd Term')),
  session text not null,
  paystack_ref text,
  status text not null default 'unpaid' check (status in ('unpaid','pending','paid','failed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.pending_admissions (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text,
  class_applying text,
  guardian_name text,
  guardian_phone text,
  date_of_birth date,
  gender text,
  previous_school text,
  address text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

create table if not exists public.blog_posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text unique,
  cover text,
  excerpt text,
  body text,
  author text,
  published_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  subject text,
  message text not null,
  created_at timestamptz default now()
);

-- Class-Subject relationship (many-to-many)
create table if not exists public.class_subjects (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references public.classes(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  teacher_id uuid references public.staff(id) on delete set null,
  created_at timestamptz default now(),
  unique(class_id, subject_id)
);

-- Student assignment submissions
create table if not exists public.assignment_submissions (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid references public.assignments(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  submission_file_url text,
  submission_text text,
  score numeric(5,2),
  feedback text,
  submitted_at timestamptz,
  graded_at timestamptz,
  status text not null default 'pending' check (status in ('pending','submitted','graded')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(assignment_id, student_id)
);

-- Job vacancies for career page
create table if not exists public.job_vacancies (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  position text not null,
  department text,
  description text,
  requirements text,
  salary_range text,
  job_type text check (job_type in ('Full-time','Part-time','Contract','Temporary')),
  deadline date,
  application_url text,
  is_active boolean default true,
  posted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','classes','subjects','staff','students','results','assignments','payments','pending_admissions','admission_applications','blog_posts','assignment_submissions','job_vacancies','class_subjects']
  loop
    execute format('drop trigger if exists trg_touch_%I on public.%I', t, t);
    execute format('create trigger trg_touch_%I before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

alter table public.students add column if not exists portal_student_id text unique;
alter table public.students add column if not exists admitted_at timestamptz;
alter table public.students add column if not exists school_name text default 'Greenfield Academy';
alter table public.students add column if not exists current_term text;
alter table public.students add column if not exists current_session text;
alter table public.students add column if not exists class_fee numeric(12,2);

create or replace function public.current_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_student_id()
returns uuid language sql stable security definer as $$
  select id from public.students where profile_id = auth.uid();
$$;

create or replace function public.current_staff_id()
returns uuid language sql stable security definer as $$
  select id from public.staff where profile_id = auth.uid();
$$;
