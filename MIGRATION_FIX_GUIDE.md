# Greenfield Academy - Admission Application Fix Guide

## Issue
Error when submitting admission applications:
```
Primary table failed: new row violates row-level security policy for table "admission_applications"
Fallback table failed: new row violates row-level security policy for table "pending_admissions"
```

## Root Cause
- Missing `student-passports` storage bucket
- Storage RLS policies not properly configured
- Missing schema and storage grants for anonymous users

## Fixes Applied

### 1. **storage.sql** - Added missing bucket
```sql
insert into storage.buckets (id, name, public)
values ('student-passports', 'student-passports', false) on conflict (id) do nothing;
```

### 2. **storage.sql** - Added storage policies
```sql
-- Student passports (applicants upload)
drop policy if exists "passports_read" on storage.objects;
create policy "passports_read" on storage.objects for select using (
    bucket_id = 'student-passports' 
    and (public.current_role() = 'admin' or public.current_role() = 'teacher')
);

drop policy if exists "passports_anon_write" on storage.objects;
create policy "passports_anon_write" on storage.objects for insert with check (
    bucket_id = 'student-passports'
);

drop policy if exists "passports_admin_delete" on storage.objects;
create policy "passports_admin_delete" on storage.objects for delete using (
    bucket_id = 'student-passports' and public.current_role() = 'admin'
);
```

### 3. **rls.sql** - Enhanced grants
- Added explicit schema grants: `grant usage on schema public to anon, authenticated;`
- Added storage schema grants
- Ensured anonymous users can insert into `admission_applications`

## Steps to Fix

### Option A: Supabase Dashboard (Recommended)

1. **Log in** to your Supabase project dashboard
2. **Go to SQL Editor** → New Query
3. **Run these migration files in order:**
   
   **Step 1:** Run [supabase/schema.sql](supabase/schema.sql)
   (if tables don't exist yet)
   
   **Step 2:** Run [supabase/rls.sql](supabase/rls.sql)
   (to update RLS policies and grants)
   
   **Step 3:** Run [supabase/storage.sql](supabase/storage.sql)
   (to create buckets and policies)

### Option B: Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or connect and run migrations directly
supabase db reset  # Warning: This resets your database!
```

### Option C: Manual SQL Execution

1. Navigate to Supabase Dashboard → SQL Editor
2. Copy the entire content of `supabase/storage.sql`
3. Paste into the editor and execute
4. Copy the updated `supabase/rls.sql` and execute
5. Test the admission form

## What These Fixes Do

| File | Change | Purpose |
|------|--------|---------|
| storage.sql | Added `student-passports` bucket | Store applicant passport photos |
| storage.sql | Added RLS policies for passports | Allow anonymous uploads, admin read/delete |
| rls.sql | Added storage grants | Permit anonymous storage access |
| rls.sql | Added schema grants | Permit table access for anon users |

## Verification

After running the migrations:

1. **Check buckets exist:**
   - Go to Supabase Dashboard → Storage → Browse Buckets
   - You should see `student-passports` bucket

2. **Test the admission form:**
   - Navigate to [apply.html](apply.html)
   - Fill in form and submit
   - Application should now submit successfully

3. **Verify data in database:**
   - Go to SQL Editor
   - Run: `SELECT * FROM public.admission_applications LIMIT 1;`
   - You should see your test submission

## If Issues Persist

### Check RLS Policies:
```sql
-- View all policies on admission_applications
SELECT * FROM pg_policies WHERE tablename = 'admission_applications';

-- Check grants
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'admission_applications';
```

### Check Storage Policies:
```sql
-- View storage policies
SELECT name, definition FROM pg_policies WHERE schemaname = 'storage';
```

### Enable Debug Mode:
In apply.html, add console logging:
```javascript
console.error('Insert error:', error);
console.error('Error details:', error.details);
```

## Database Structure

### Admission Applications Table
```sql
- id (UUID, PK)
- first_name, middle_name, last_name, full_name
- email, phone, gender, date_of_birth
- class_applying, previous_school
- passport_photo_url (Storage URL)
- country, state, lga, street_address
- reference_number (auto-generated)
- status ('pending', 'approved', 'rejected')
- created_at, updated_at
```

### Storage Buckets
- `student-passports` - Private, contains uploaded passport photos
- Other buckets: assignments, submissions, result-pdfs, avatars, blog-images

## Contact Support

If migrations fail:
1. Check Supabase status page: https://status.supabase.com
2. Verify you have `Admin` role in your Supabase project
3. Check browser console for detailed error messages
4. Review Supabase documentation: https://supabase.com/docs
