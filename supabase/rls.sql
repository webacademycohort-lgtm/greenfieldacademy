-- Greenfield Academy portal RLS policies (matches js/*.js frontend queries)

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.staff enable row level security;
alter table public.students enable row level security;
alter table public.results enable row level security;
alter table public.assignments enable row level security;
alter table public.payments enable row level security;
alter table public.pending_admissions enable row level security;
alter table public.admission_applications enable row level security;
alter table public.blog_posts enable row level security;
alter table public.contact_messages enable row level security;
alter table public.parent_notifications enable row level security;
alter table public.broadcast_messages enable row level security;
alter table public.class_subjects enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.job_vacancies enable row level security;

-- profiles
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles
for select using (true);

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- classes / subjects
drop policy if exists classes_read_all on public.classes;
create policy classes_read_all on public.classes
for select using (true);

drop policy if exists subjects_read_all on public.subjects;
create policy subjects_read_all on public.subjects
for select using (true);

drop policy if exists classes_admin_all on public.classes;
create policy classes_admin_all on public.classes
for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists subjects_admin_all on public.subjects;
create policy subjects_admin_all on public.subjects
for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- staff
drop policy if exists staff_read_auth on public.staff;
create policy staff_read_auth on public.staff
for select using (public.current_role() in ('admin','teacher') or profile_id = auth.uid());

drop policy if exists staff_admin_all on public.staff;
create policy staff_admin_all on public.staff
for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- students
drop policy if exists students_self_or_staff_read on public.students;
create policy students_self_or_staff_read on public.students
for select using (
  profile_id = auth.uid()
  or public.current_role() in ('admin','teacher')
);

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

drop policy if exists students_admin_all on public.students;
create policy students_admin_all on public.students
for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- results
drop policy if exists results_student_read_paid on public.results;
create policy results_student_read_paid on public.results
for select using (
  public.current_role() = 'student'
  and student_id = public.current_student_id()
  and exists (
    select 1 from public.payments p
    where p.student_id = results.student_id
      and p.term = results.term
      and p.session = results.session
      and p.status = 'paid'
  )
);

drop policy if exists results_teacher_admin_write on public.results;
create policy results_teacher_admin_write on public.results
for all using (public.current_role() in ('teacher','admin'))
with check (public.current_role() in ('teacher','admin'));

-- assignments
drop policy if exists assignments_student_read on public.assignments;
create policy assignments_student_read on public.assignments
for select using (
  public.current_role() = 'admin'
  or public.current_role() = 'teacher'
  or (
    public.current_role() = 'student'
    and class_id = (select class_id from public.students where profile_id = auth.uid())
  )
);

drop policy if exists assignments_teacher_admin_write on public.assignments;
create policy assignments_teacher_admin_write on public.assignments
for all using (
  public.current_role() = 'admin'
  or uploaded_by = public.current_staff_id()
)
with check (
  public.current_role() = 'admin'
  or uploaded_by = public.current_staff_id()
);

-- payments
drop policy if exists payments_student_read on public.payments;
create policy payments_student_read on public.payments
for select using (
  public.current_role() = 'admin'
  or student_id = public.current_student_id()
);

drop policy if exists payments_student_insert on public.payments;
create policy payments_student_insert on public.payments
for insert with check (
  public.current_role() = 'admin'
  or student_id = public.current_student_id()
);

drop policy if exists payments_admin_update on public.payments;
create policy payments_admin_update on public.payments
for update using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- pending admissions
drop policy if exists pending_public_insert on public.pending_admissions;
create policy pending_public_insert on public.pending_admissions
for insert with check (true);

grant usage on schema public to anon, authenticated;
grant insert on public.pending_admissions to anon, authenticated;
grant select, insert, update on public.students to authenticated;
grant select, insert, update on public.payments to authenticated;

drop policy if exists pending_admin_select on public.pending_admissions;
create policy pending_admin_select on public.pending_admissions
for select using (public.current_role() = 'admin');

drop policy if exists pending_admin_update on public.pending_admissions;
create policy pending_admin_update on public.pending_admissions
for update using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- admission applications (new apply flow)
drop policy if exists admission_apps_public_insert on public.admission_applications;
create policy admission_apps_public_insert on public.admission_applications
for insert with check (true);

grant usage on schema public to anon, authenticated;
grant insert on public.admission_applications to anon, authenticated;

drop policy if exists admission_apps_admin_select on public.admission_applications;
create policy admission_apps_admin_select on public.admission_applications
for select using (public.current_role() = 'admin');

drop policy if exists admission_apps_admin_update on public.admission_applications;
create policy admission_apps_admin_update on public.admission_applications
for update using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- blog posts
drop policy if exists blog_public_read on public.blog_posts;
create policy blog_public_read on public.blog_posts
for select using (true);

drop policy if exists blog_admin_write on public.blog_posts;
create policy blog_admin_write on public.blog_posts
for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- contact messages
drop policy if exists contact_public_insert on public.contact_messages;
create policy contact_public_insert on public.contact_messages
for insert with check (true);

drop policy if exists contact_admin_read on public.contact_messages;
create policy contact_admin_read on public.contact_messages
for select using (public.current_role() = 'admin');

-- parent notifications
drop policy if exists parent_notifications_admin_all on public.parent_notifications;
create policy parent_notifications_admin_all on public.parent_notifications
for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- broadcasts
drop policy if exists broadcast_admin_insert on public.broadcast_messages;
create policy broadcast_admin_insert on public.broadcast_messages
for insert with check (public.current_role() = 'admin');

drop policy if exists broadcast_admin_select on public.broadcast_messages;
create policy broadcast_admin_select on public.broadcast_messages
for select using (public.current_role() = 'admin');

drop policy if exists broadcast_audience_read on public.broadcast_messages;
create policy broadcast_audience_read on public.broadcast_messages
for select using (
  public.current_role() = 'admin'
  or audience = 'all'
  or (audience = 'students' and public.current_role() = 'student')
  or (audience = 'teachers' and public.current_role() = 'teacher')
);

-- class_subjects (students and teachers can view their subjects)
drop policy if exists class_subjects_read on public.class_subjects;
create policy class_subjects_read on public.class_subjects
for select using (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'student'
    and class_id = (select class_id from public.students where profile_id = auth.uid())
  )
  or (
    public.current_role() = 'teacher'
    and teacher_id = public.current_staff_id()
  )
);

drop policy if exists class_subjects_admin_all on public.class_subjects;
create policy class_subjects_admin_all on public.class_subjects
for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- assignment_submissions (students can submit, teachers can grade, admins can view all)
drop policy if exists submissions_student_insert on public.assignment_submissions;
create policy submissions_student_insert on public.assignment_submissions
for insert with check (
  public.current_role() = 'student'
  and student_id = public.current_student_id()
);

drop policy if exists submissions_student_read on public.assignment_submissions;
create policy submissions_student_read on public.assignment_submissions
for select using (
  public.current_role() = 'admin'
  or student_id = public.current_student_id()
  or (
    public.current_role() = 'teacher'
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_submissions.assignment_id
        and a.uploaded_by = public.current_staff_id()
    )
  )
);

drop policy if exists submissions_student_update on public.assignment_submissions;
create policy submissions_student_update on public.assignment_submissions
for update using (
  (public.current_role() = 'student' and student_id = public.current_student_id() and status = 'pending')
  or public.current_role() = 'admin'
)
with check (
  (public.current_role() = 'student' and student_id = public.current_student_id() and status = 'pending')
  or public.current_role() = 'admin'
);

drop policy if exists submissions_teacher_grade on public.assignment_submissions;
create policy submissions_teacher_grade on public.assignment_submissions
for update using (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'teacher'
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_submissions.assignment_id
        and a.uploaded_by = public.current_staff_id()
    )
  )
)
with check (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'teacher'
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_submissions.assignment_id
        and a.uploaded_by = public.current_staff_id()
    )
  )
);

-- job_vacancies (public read, admin write)
drop policy if exists vacancies_public_read on public.job_vacancies;
create policy vacancies_public_read on public.job_vacancies
for select using (is_active = true or public.current_role() = 'admin');

drop policy if exists vacancies_admin_write on public.job_vacancies;
create policy vacancies_admin_write on public.job_vacancies
for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- Storage grants
grant usage on schema storage to anon, authenticated;
grant all on storage.buckets to anon, authenticated;
grant all on storage.objects to anon, authenticated;
