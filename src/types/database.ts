// =============================================================================
// Greenfield Academy — Generated-style Supabase types
// In a real Next.js project run:  supabase gen types typescript --project-id <id>
// This file matches the schema in /supabase/schema.sql.
// =============================================================================

export type UserRole = 'admin' | 'teacher' | 'student';
export type TermEnum = '1st' | '2nd' | '3rd';
export type FeeStatus = 'unpaid' | 'pending' | 'paid';
export type AssignmentStatus = 'submitted' | 'graded' | 'returned';
export type GradeEnum = 'A1' | 'B2' | 'B3' | 'C4' | 'C5' | 'C6' | 'D7' | 'E8' | 'F9';
export type RemarkEnum =
  | 'Distinction' | 'Excellent' | 'Very Good' | 'Good'
  | 'Credit' | 'Pass' | 'Fail';
export type PrefectTitle =
  | 'head_boy' | 'head_girl' | 'asst_head_boy' | 'asst_head_girl'
  | 'library_prefect' | 'sport_prefect' | 'labor_prefect'
  | 'health_prefect' | 'social_prefect' | 'class_captain' | 'none';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone_number: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcademicSession {
  id: string;
  session_name: string;
  is_current: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Term {
  id: string;
  session_id: string;
  term: TermEnum;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface Class {
  id: string;
  class_name: string;
  category: 'junior' | 'senior';
  level: 1 | 2 | 3;
  created_at: string;
}

export interface Arm {
  id: string;
  class_id: string;
  arm_name: string;
  class_teacher_id: string | null;
  capacity: number;
}

export interface Staff {
  id: string;
  profile_id: string;
  employee_id: string;
  qualifications: string[] | null;
  subjects_taught: string[];
  date_joined: string;
  employment_status: 'active' | 'suspended' | 'retired';
}

export interface Student {
  id: string;
  profile_id: string;
  admission_number: string;
  arm_id: string;
  prefect_title: PrefectTitle;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  address: string | null;
  date_of_birth: string | null;
  state_of_origin: string | null;
  lga: string | null;
  blood_group: string | null;
  medical_conditions: string | null;
  date_admitted: string;
  graduation_date: string | null;
  status: 'active' | 'graduated' | 'transferred' | 'expelled' | 'suspended';
}

export interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  category: 'core' | 'elective' | 'vocational';
  applicable_classes: string[];
}

export interface TeacherAssignment {
  id: string;
  staff_id: string;
  subject_id: string;
  arm_id: string;
  term_id: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  author_id: string;
  category: 'announcement' | 'event' | 'academic' | 'sports';
  tags: string[] | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  arm_id: string;
  term_id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  max_score: number;
  due_date: string;
  created_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string | null;
  content: string | null;
  score: number | null;
  teacher_feedback: string | null;
  status: AssignmentStatus;
  submitted_at: string;
  graded_at: string | null;
}

export interface Result {
  id: string;
  student_id: string;
  subject_id: string;
  term_id: string;
  ca_test_1: number | null;
  ca_test_2: number | null;
  ca_total: number;
  exam_score: number | null;
  total_score: number;
  grade: GradeEnum | null;
  remark: RemarkEnum | null;
  position_in_class: number | null;
  entered_by: string | null;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentItem {
  id: string;
  name: string;
  term_id: string;
  arm_id: string | null;
  amount: number;
  is_mandatory: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  student_id: string;
  term_id: string;
  payment_items: string[];
  total_amount: number;
  amount_paid: number;
  paystack_reference: string | null;
  paystack_access_code: string | null;
  paystack_status: 'pending' | 'success' | 'failed' | 'abandoned' | null;
  fee_status: FeeStatus;
  verified_by: string | null;
  payment_method: 'paystack' | 'bank_transfer' | 'cash' | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string | null;
  subject: string | null;
  message: string;
  created_at: string;
}

// View
export interface StudentResultView {
  admission_number: string;
  prefect_title: PrefectTitle;
  student_name: string;
  arm_id: string;
  arm_name: string;
  class_name: string;
  subject_name: string;
  subject_code: string;
  ca_test_1: number | null;
  ca_test_2: number | null;
  ca_total: number;
  exam_score: number | null;
  total_score: number;
  grade: GradeEnum | null;
  remark: RemarkEnum | null;
  position_in_class: number | null;
  term: TermEnum;
  session_name: string;
  is_result_locked: boolean;
  result_date: string;
}

// Supabase generic Database type (subset)
export type Database = {
  public: {
    Tables: {
      profiles:               { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      academic_sessions:      { Row: AcademicSession; Insert: Partial<AcademicSession>; Update: Partial<AcademicSession> };
      terms:                  { Row: Term; Insert: Partial<Term>; Update: Partial<Term> };
      classes:                { Row: Class; Insert: Partial<Class>; Update: Partial<Class> };
      arms:                   { Row: Arm; Insert: Partial<Arm>; Update: Partial<Arm> };
      staff:                  { Row: Staff; Insert: Partial<Staff>; Update: Partial<Staff> };
      students:               { Row: Student; Insert: Partial<Student>; Update: Partial<Student> };
      subjects:               { Row: Subject; Insert: Partial<Subject>; Update: Partial<Subject> };
      teacher_assignments:    { Row: TeacherAssignment; Insert: Partial<TeacherAssignment>; Update: Partial<TeacherAssignment> };
      blog_posts:             { Row: BlogPost; Insert: Partial<BlogPost>; Update: Partial<BlogPost> };
      assignments:            { Row: Assignment; Insert: Partial<Assignment>; Update: Partial<Assignment> };
      assignment_submissions: { Row: AssignmentSubmission; Insert: Partial<AssignmentSubmission>; Update: Partial<AssignmentSubmission> };
      results:                { Row: Result; Insert: Partial<Result>; Update: Partial<Result> };
      payment_items:          { Row: PaymentItem; Insert: Partial<PaymentItem>; Update: Partial<PaymentItem> };
      payments:               { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> };
      contact_messages:       { Row: ContactMessage; Insert: Partial<ContactMessage>; Update: Partial<ContactMessage> };
    };
    Views: {
      student_result_view: { Row: StudentResultView };
    };
  };
};
