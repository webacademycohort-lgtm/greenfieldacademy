// =============================================================================
// Greenfield Academy — App-level types
// =============================================================================
export * from './database';

import { Profile, Student, Staff, Result, Subject, Arm, Class, Term } from './database';

// Convenience composites
export interface StudentWithProfile extends Student {
  profile: Profile;
  arm?: Arm & { class?: Class };
}

export interface StaffWithProfile extends Staff {
  profile: Profile;
}

export interface ResultRow extends Result {
  subject?: Subject;
  term?: Term;
}

// Auth helpers
export interface SessionUser {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  full_name: string;
}

// Paystack
export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackWebhookEvent<T = any> {
  event: string;          // e.g. 'charge.success'
  data: T;
}
