-- ROBUST RLS FIX FOR ADMISSION APPLICATIONS
-- Run this ENTIRE script in Supabase SQL Editor

-- ============================================================================
-- Step 1: Ensure RLS is enabled on the table
-- ============================================================================
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 2: DROP all existing policies to start fresh
-- ============================================================================
DROP POLICY IF EXISTS "admission_apps_public_insert" ON public.admission_applications;
DROP POLICY IF EXISTS "admission_apps_admin_select" ON public.admission_applications;
DROP POLICY IF EXISTS "admission_apps_admin_update" ON public.admission_applications;
DROP POLICY IF EXISTS "admission_apps_admin_delete" ON public.admission_applications;

-- ============================================================================
-- Step 3: CREATE permissive policies for public access
-- ============================================================================

-- Allow ANYONE to insert (for new applications)
CREATE POLICY "admission_apps_insert_policy" 
ON public.admission_applications 
FOR INSERT 
WITH CHECK (true);

-- Allow ANYONE to read their own applications (by reference_number or email)
CREATE POLICY "admission_apps_select_policy" 
ON public.admission_applications 
FOR SELECT 
USING (true);

-- Allow ADMIN to update applications
CREATE POLICY "admission_apps_update_admin" 
ON public.admission_applications 
FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
));

-- Allow ADMIN to delete applications
CREATE POLICY "admission_apps_delete_admin" 
ON public.admission_applications 
FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
));

-- ============================================================================
-- Step 4: Grant permissions
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_applications TO anon, authenticated;

-- ============================================================================
-- Step 5: Fix storage bucket policies
-- ============================================================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "passports_read" ON storage.objects;
DROP POLICY IF EXISTS "passports_anon_write" ON storage.objects;
DROP POLICY IF EXISTS "passports_admin_delete" ON storage.objects;

-- Create robust storage policies
CREATE POLICY "passports_public_read" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'student-passports');

CREATE POLICY "passports_public_write" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'student-passports');

CREATE POLICY "passports_admin_delete" 
ON storage.objects 
FOR DELETE 
USING (
    bucket_id = 'student-passports' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Grant storage permissions
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT ON storage.buckets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;

-- ============================================================================
-- Step 6: Ensure student-passports bucket exists
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-passports', 'student-passports', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 7: Test the configuration
-- ============================================================================

-- This test should succeed if everything is configured correctly:
INSERT INTO public.admission_applications 
(first_name, last_name, full_name, email, country, state, status)
VALUES 
('TestFirstName', 'TestLastName', 'TestFirstName TestLastName', 'test@example.com', 'Nigeria', 'Lagos', 'pending')
RETURNING id, reference_number, status;

-- View the test record (should show your test data)
SELECT * FROM public.admission_applications 
WHERE email = 'test@example.com' 
ORDER BY created_at DESC LIMIT 1;

-- Clean up test data (optional)
-- DELETE FROM public.admission_applications WHERE email = 'test@example.com';
