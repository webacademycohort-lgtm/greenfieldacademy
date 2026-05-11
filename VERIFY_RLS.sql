-- Run these checks in Supabase SQL Editor to verify configuration

-- Check 1: Verify admission_applications table exists and has RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'admission_applications';

-- Check 2: List all policies on admission_applications
SELECT * FROM pg_policies 
WHERE tablename = 'admission_applications';

-- Check 3: Verify grants on admission_applications
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'admission_applications';

-- Check 4: Verify storage bucket exists
SELECT id, name, public FROM storage.buckets 
WHERE id = 'student-passports';

-- Check 5: Verify storage policies for student-passports
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check 6: Test anonymous insert (will show if policy works)
-- This should return no error if everything is correct:
INSERT INTO public.admission_applications 
(first_name, last_name, full_name, email, country, state, status)
VALUES 
('Test', 'User', 'Test User', 'test@example.com', 'Nigeria', 'Lagos', 'pending')
RETURNING id;

-- If the above works, delete the test record:
-- DELETE FROM public.admission_applications WHERE email = 'test@example.com';
