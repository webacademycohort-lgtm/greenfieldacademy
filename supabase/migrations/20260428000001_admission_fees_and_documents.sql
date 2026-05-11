-- Migration: Add admission fees and document uploads support

-- Add fee_type to payments table to distinguish between admission and tuition
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS fee_type text not null default 'tuition' check (fee_type in ('admission', 'tuition'));

-- Add admission_fee_paid field to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS admission_fee_paid boolean default false,
ADD COLUMN IF NOT EXISTS admission_fee_paid_date timestamptz;

-- Create document_uploads table to track student document submissions
CREATE TABLE IF NOT EXISTS public.document_uploads (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete cascade not null,
  document_type text not null check (document_type in ('date_of_birth_cert', 'nin_id_card', 'passport', 'birth_cert', 'other')),
  file_url text not null,
  file_size integer,
  file_name text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'awaiting_review')),
  rejection_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_document_uploads_student_id ON public.document_uploads(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_fee_type ON public.payments(fee_type);

-- Function to automatically create admission fee payment record when student is admitted
CREATE OR REPLACE FUNCTION public.create_admission_fee_payment()
RETURNS trigger language plpgsql as $$
begin
  -- Only create if this is a new student being inserted with a class assignment
  IF new.class_id IS NOT NULL AND old.class_id IS NULL THEN
    INSERT INTO public.payments (
      student_id,
      amount,
      term,
      session,
      fee_type,
      status
    ) VALUES (
      new.id,
      5000, -- Admission fee is fixed at N5,000
      'Admission',
      (SELECT COALESCE(
        (SELECT value FROM (VALUES ('2024/2025'), ('2025/2026')) AS t(value) LIMIT 1), 
        '2024/2025'
      )),
      'admission',
      'unpaid'
    ) ON CONFLICT DO NOTHING;
  END IF;
  RETURN new;
end;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_create_admission_fee ON public.students;
CREATE TRIGGER trg_create_admission_fee
AFTER INSERT OR UPDATE OF class_id ON public.students
FOR EACH ROW EXECUTE FUNCTION public.create_admission_fee_payment();
