-- Create marks tracking tables for teachers to record student performance
-- Assignment Marks table
CREATE TABLE IF NOT EXISTS public.assignment_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  assignment_title VARCHAR(255) NOT NULL,
  score DECIMAL(5, 2) NOT NULL CHECK (score >= 0),
  max_score DECIMAL(5, 2) NOT NULL CHECK (max_score > 0),
  term VARCHAR(50),
  session VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exam Marks table
CREATE TABLE IF NOT EXISTS public.exam_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  exam_title VARCHAR(255) NOT NULL,
  score DECIMAL(5, 2) NOT NULL CHECK (score >= 0),
  max_score DECIMAL(5, 2) NOT NULL CHECK (max_score > 0),
  exam_date DATE,
  term VARCHAR(50),
  session VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test Marks table
CREATE TABLE IF NOT EXISTS public.test_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  test_title VARCHAR(255) NOT NULL,
  score DECIMAL(5, 2) NOT NULL CHECK (score >= 0),
  max_score DECIMAL(5, 2) NOT NULL CHECK (max_score > 0),
  term VARCHAR(50),
  session VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_assignment_marks_teacher ON public.assignment_marks(teacher_id);
CREATE INDEX idx_assignment_marks_student ON public.assignment_marks(student_id);
CREATE INDEX idx_assignment_marks_class ON public.assignment_marks(class_id);
CREATE INDEX idx_assignment_marks_subject ON public.assignment_marks(subject_id);

CREATE INDEX idx_exam_marks_teacher ON public.exam_marks(teacher_id);
CREATE INDEX idx_exam_marks_student ON public.exam_marks(student_id);
CREATE INDEX idx_exam_marks_class ON public.exam_marks(class_id);
CREATE INDEX idx_exam_marks_subject ON public.exam_marks(subject_id);

CREATE INDEX idx_test_marks_teacher ON public.test_marks(teacher_id);
CREATE INDEX idx_test_marks_student ON public.test_marks(student_id);
CREATE INDEX idx_test_marks_class ON public.test_marks(class_id);
CREATE INDEX idx_test_marks_subject ON public.test_marks(subject_id);

CREATE INDEX idx_attendance_teacher ON public.attendance(teacher_id);
CREATE INDEX idx_attendance_student ON public.attendance(student_id);
CREATE INDEX idx_attendance_class ON public.attendance(class_id);
CREATE INDEX idx_attendance_date ON public.attendance(attendance_date);

-- RLS Policies for marks tables

-- Assignment Marks RLS
ALTER TABLE public.assignment_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can insert their own assignment marks"
  ON public.assignment_marks FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their own assignment marks"
  ON public.assignment_marks FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can view assignment marks for their classes"
  ON public.assignment_marks FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can view assignment marks for their classes"
  ON public.assignment_marks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = assignment_marks.student_id
      AND students.profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all assignment marks"
  ON public.assignment_marks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Exam Marks RLS
ALTER TABLE public.exam_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can insert their own exam marks"
  ON public.exam_marks FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their own exam marks"
  ON public.exam_marks FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can view exam marks for their classes"
  ON public.exam_marks FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can view exam marks for their classes"
  ON public.exam_marks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = exam_marks.student_id
      AND students.profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all exam marks"
  ON public.exam_marks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Test Marks RLS
ALTER TABLE public.test_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can insert their own test marks"
  ON public.test_marks FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their own test marks"
  ON public.test_marks FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can view test marks for their classes"
  ON public.test_marks FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can view test marks for their classes"
  ON public.test_marks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = test_marks.student_id
      AND students.profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all test marks"
  ON public.test_marks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Attendance RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can insert attendance records"
  ON public.attendance FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their attendance records"
  ON public.attendance FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can view attendance for their classes"
  ON public.attendance FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can view their own attendance"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = attendance.student_id
      AND students.profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all attendance"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
