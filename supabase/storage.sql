-- =============================================================================
-- GREENFIELD ACADEMY — STORAGE BUCKETS & POLICIES
-- Run AFTER schema.sql + rls.sql
-- =============================================================================

-- Buckets
insert into storage.buckets (id, name, public)
values ('assignments',  'assignments',  true)  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('submissions',  'submissions',  false) on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('result-pdfs',  'result-pdfs',  false) on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars',      'avatars',      true)  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('blog-images',  'blog-images',  true)  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('student-passports', 'student-passports', false) on conflict (id) do nothing;

-- ---------- assignments (teachers/admin upload, anyone signed-in reads) -----
drop policy if exists "assignments_read"   on storage.objects;
create policy "assignments_read"   on storage.objects for select
  using (bucket_id = 'assignments' and auth.role() = 'authenticated');

drop policy if exists "assignments_write"  on storage.objects;
create policy "assignments_write"  on storage.objects for insert
  with check (bucket_id = 'assignments' and public.current_role() in ('teacher','admin'));

drop policy if exists "assignments_update" on storage.objects;
create policy "assignments_update" on storage.objects for update
  using (bucket_id = 'assignments' and public.current_role() in ('teacher','admin'));

drop policy if exists "assignments_delete" on storage.objects;
create policy "assignments_delete" on storage.objects for delete
  using (bucket_id = 'assignments' and public.current_role() in ('teacher','admin'));

-- ---------- submissions (students upload to their own folder) ---------------
drop policy if exists "submissions_self_read"  on storage.objects;
create policy "submissions_self_read" on storage.objects for select using (
    bucket_id = 'submissions'
    and (
        public.current_role() in ('admin','teacher')
        or (storage.foldername(name))[1] = auth.uid()::text
    )
);

drop policy if exists "submissions_self_write" on storage.objects;
create policy "submissions_self_write" on storage.objects for insert with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------- result-pdfs (students read own folder; admin writes) ------------
drop policy if exists "results_read" on storage.objects;
create policy "results_read" on storage.objects for select using (
    bucket_id = 'result-pdfs'
    and (
        public.current_role() = 'admin'
        or (storage.foldername(name))[1] = (
            select admission_no from public.students where profile_id = auth.uid()
        )
    )
);

drop policy if exists "results_write" on storage.objects;
create policy "results_write" on storage.objects for insert with check (
    bucket_id = 'result-pdfs' and public.current_role() in ('admin','teacher')
);

-- ---------- avatars (own writes; public read) -------------------------------
drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_self_write" on storage.objects;
create policy "avatars_self_write" on storage.objects for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------- blog images (admin writes; public read) -------------------------
drop policy if exists "blog_images_read" on storage.objects;
create policy "blog_images_read" on storage.objects for select using (bucket_id = 'blog-images');

drop policy if exists "blog_images_admin_write" on storage.objects;
create policy "blog_images_admin_write" on storage.objects for insert with check (
    bucket_id = 'blog-images' and public.current_role() = 'admin'
);

-- ---------- student passports (applicants upload) ---------------------------
drop policy if exists "passports_read" on storage.objects;
create policy "passports_read" on storage.objects for select using (
    bucket_id = 'student-passports' 
    and (
        public.current_role() = 'admin'
        or public.current_role() = 'teacher'
    )
);

drop policy if exists "passports_anon_write" on storage.objects;
create policy "passports_anon_write" on storage.objects for insert with check (
    bucket_id = 'student-passports'
);

drop policy if exists "passports_admin_delete" on storage.objects;
create policy "passports_admin_delete" on storage.objects for delete using (
    bucket_id = 'student-passports' and public.current_role() = 'admin'
);
