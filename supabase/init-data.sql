-- Greenfield Academy - Initial Data Setup Script
-- Run this in Supabase SQL Editor after executing schema.sql and rls.sql
-- This script populates classes, subjects, class-subject relationships, and sample job vacancies

-- ============================================================================
-- Step 1: Add Classes (JSS and SSS levels)
-- ============================================================================
INSERT INTO public.classes (id, name, level, teacher_id) VALUES
(uuid_generate_v4(), 'JSS 1A', 'JSS', NULL),
(uuid_generate_v4(), 'JSS 1B', 'JSS', NULL),
(uuid_generate_v4(), 'JSS 2A', 'JSS', NULL),
(uuid_generate_v4(), 'JSS 2B', 'JSS', NULL),
(uuid_generate_v4(), 'JSS 3A', 'JSS', NULL),
(uuid_generate_v4(), 'JSS 3B', 'JSS', NULL),
(uuid_generate_v4(), 'SSS 1A', 'SSS', NULL),
(uuid_generate_v4(), 'SSS 1B', 'SSS', NULL),
(uuid_generate_v4(), 'SSS 2A', 'SSS', NULL),
(uuid_generate_v4(), 'SSS 2B', 'SSS', NULL),
(uuid_generate_v4(), 'SSS 3A', 'SSS', NULL),
(uuid_generate_v4(), 'SSS 3B', 'SSS', NULL)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Step 2: Add Core Subjects
-- ============================================================================
INSERT INTO public.subjects (id, name, code) VALUES
(uuid_generate_v4(), 'English Language', 'ENG101'),
(uuid_generate_v4(), 'Mathematics', 'MAT101'),
(uuid_generate_v4(), 'Physics', 'PHY101'),
(uuid_generate_v4(), 'Chemistry', 'CHE101'),
(uuid_generate_v4(), 'Biology', 'BIO101'),
(uuid_generate_v4(), 'History', 'HIS101'),
(uuid_generate_v4(), 'Geography', 'GEO101'),
(uuid_generate_v4(), 'Civic Education', 'CIV101'),
(uuid_generate_v4(), 'Christian Religion Knowledge', 'CRK101'),
(uuid_generate_v4(), 'Literature in English', 'LIT101'),
(uuid_generate_v4(), 'Agricultural Science', 'AGR101'),
(uuid_generate_v4(), 'Business Studies', 'BUS101'),
(uuid_generate_v4(), 'Economics', 'ECO101'),
(uuid_generate_v4(), 'Computer Science', 'CSC101'),
(uuid_generate_v4(), 'Physical Education', 'PED101')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Step 3: Link All Classes to All Subjects
-- ============================================================================
-- This creates the class-subject relationships
-- In production, you'd assign specific teachers to specific subjects per class
INSERT INTO public.class_subjects (id, class_id, subject_id, teacher_id)
SELECT 
  uuid_generate_v4(),
  c.id,
  s.id,
  NULL  -- Teachers will be assigned later
FROM public.classes c
CROSS JOIN public.subjects s
ON CONFLICT (class_id, subject_id) DO NOTHING;

-- ============================================================================
-- Step 4: Add Sample Job Vacancies
-- ============================================================================
INSERT INTO public.job_vacancies 
(id, title, position, department, description, requirements, salary_range, job_type, deadline, is_active) 
VALUES

-- Mathematics Teacher
(uuid_generate_v4(),
 'Senior Mathematics Teacher',
 'Full-Time Teacher',
 'Mathematics Department',
 'We are seeking an experienced and passionate Mathematics teacher to join our growing team. You will be responsible for teaching Mathematics to students across JSS and SSS levels. The ideal candidate should have a strong background in mathematics education and the ability to inspire students to excel.',
 'BSc in Mathematics or related field
PGDE or equivalent teaching certification
Minimum 5 years of teaching experience
Strong communication and interpersonal skills
Experience with modern teaching methodologies',
 '₦2,500,000 - ₦3,500,000 per annum',
 'Full-time',
 now() + interval '45 days',
 true),

-- English Language Teacher
(uuid_generate_v4(),
 'English Language Teacher',
 'Full-Time Teacher',
 'English Department',
 'Passionate English Language teacher needed to develop students'' language skills, literature appreciation, and communication abilities. This is an excellent opportunity to shape young minds and foster a love for the English language.',
 'BA/BSc in English or English Literature
PGDE or equivalent certification
Minimum 3 years teaching experience
Proficiency in curriculum design
Strong grasp of grammar and literature',
 '₦2,000,000 - ₦3,000,000 per annum',
 'Full-time',
 now() + interval '50 days',
 true),

-- Science Teacher (Physics/Chemistry)
(uuid_generate_v4(),
 'Science Teacher (Physics/Chemistry)',
 'Full-Time Teacher',
 'Science Department',
 'Dedicated Science teacher to teach Physics and Chemistry to JSS and SSS students. Must be capable of designing engaging laboratory experiments and making science concepts relatable to students.',
 'BSc in Physics, Chemistry or related science
PGDE or teaching certification
Minimum 4 years experience
Laboratory management skills
Knowledge of safety protocols',
 '₦2,200,000 - ₦3,200,000 per annum',
 'Full-time',
 now() + interval '40 days',
 true),

-- ICT/Computer Science Teacher
(uuid_generate_v4(),
 'Computer Science/ICT Teacher',
 'Full-Time Teacher',
 'ICT Department',
 'We are looking for a tech-savvy educator to teach Computer Science and ICT to students. This role involves teaching programming, digital literacy, and computer applications.',
 'BSc in Computer Science or IT
PGDE or teaching certification
Minimum 3 years teaching experience
Proficiency in programming languages (Python, Java, C++)
Knowledge of cybersecurity basics',
 '₦2,300,000 - ₦3,300,000 per annum',
 'Full-time',
 now() + interval '35 days',
 true),

-- Guidance Counselor
(uuid_generate_v4(),
 'School Guidance Counselor',
 'Full-Time Counselor',
 'Student Services',
 'Professional counselor needed to provide guidance and counseling services to students. Will conduct career guidance programs, handle student welfare issues, and work with parents.',
 'Degree in Psychology, Education or Counseling
Professional counseling certification
Minimum 2 years experience
Strong interpersonal skills
Experience with adolescents',
 '₦1,800,000 - ₦2,500,000 per annum',
 'Full-time',
 now() + interval '55 days',
 true),

-- School Librarian
(uuid_generate_v4(),
 'School Librarian',
 'Full-Time Librarian',
 'Library Services',
 'Experienced librarian to manage and develop the school library. Responsible for cataloging resources, conducting library sessions, and promoting reading culture.',
 'Degree in Library Science or Information Management
Professional librarian certification
Minimum 3 years experience
Knowledge of library management systems
Strong organizational skills',
 '₦1,600,000 - ₦2,200,000 per annum',
 'Full-time',
 now() + interval '60 days',
 true),

-- Sports Coach
(uuid_generate_v4(),
 'Physical Education Teacher / Sports Coach',
 'Full-Time Coach',
 'Sports Department',
 'Dedicated sports professional to lead the school''s physical education program and sports teams. Develop athletic talent and promote healthy living.',
 'Degree in Physical Education or Sports Science
Professional coaching certification
Minimum 2 years coaching experience
Knowledge of sports safety
Team management skills',
 '₦1,500,000 - ₦2,200,000 per annum',
 'Full-time',
 now() + interval '45 days',
 true),

-- Administrative Assistant
(uuid_generate_v4(),
 'Administrative Assistant',
 'Full-Time Administrator',
 'Administration',
 'Organized and detail-oriented administrative professional to support the school administration office. Handle correspondence, scheduling, and general office duties.',
 'Higher National Diploma (HND) or equivalent
Minimum 2 years administrative experience
Proficiency in MS Office and email
Strong organizational and communication skills
Ability to multitask',
 '₦800,000 - ₦1,200,000 per annum',
 'Full-time',
 now() + interval '40 days',
 true);

-- ============================================================================
-- Step 5: Verify Data Entry
-- ============================================================================

-- Check classes
SELECT COUNT(*) as total_classes FROM public.classes;

-- Check subjects
SELECT COUNT(*) as total_subjects FROM public.subjects;

-- Check class-subject relationships
SELECT COUNT(*) as total_class_subjects FROM public.class_subjects;

-- Check job vacancies
SELECT COUNT(*) as total_vacancies FROM public.job_vacancies WHERE is_active = true;

-- ============================================================================
-- Data Entry Complete!
-- ============================================================================
-- You can now:
-- 1. View subjects at: /subjects.html
-- 2. Browse careers at: /careers.html
-- 3. Students will see assignments for their class
-- 4. Assign teachers to subjects by updating class_subjects table:
--
--    UPDATE public.class_subjects 
--    SET teacher_id = [staff_id]
--    WHERE subject_id = [subject_id] AND class_id = [class_id];
