export type LeadStatus =
  | "inquiry"
  | "tour_scheduled"
  | "application_sent"
  | "enrolled"
  | "lost";

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: LeadStatus;
  source_campaign: string | null;
  notes: string | null;
  assigned_counselor_id: string | null;
  last_contacted_at: string | null;
  enrolled_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CommunicationPreference = "email_only" | "sms_only" | "both";

export interface Guardian {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  communication_preference: CommunicationPreference;
}

export type EnrollmentStatus =
  | "inquiry"
  | "applied"
  | "accepted"
  | "enrolled"
  | "withdrawn"
  | "graduated";

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  grade_level: string;
  enrollment_status: EnrollmentStatus;
  guardians?: Guardian[];
}

export interface Section {
  id: string;
  name: string;
  grade_level: string;
  room: string | null;
  semester: string;
  students_count?: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: { total: number; per_page?: number; current_page?: number };
}

export interface ApiResource<T> {
  data: T;
}
