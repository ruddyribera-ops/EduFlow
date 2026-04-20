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
  relationship_type?: string;
}

export type EnrollmentStatus =
  | "inquiry"
  | "applied"
  | "accepted"
  | "enrolled"
  | "withdrawn"
  | "graduated";

export type UserRole = "admin" | "counselor" | "teacher" | "guardian";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Section {
  id: string;
  name: string;
  grade_level: string;
  room: string | null;
  semester: string;
  teacher_id: string | null;
  counselor_id: string | null;
  teacher?: User | null;
  counselor?: User | null;
  students?: Student[];
  teachers?: User[];
  students_count?: number;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  dob?: string | null;
  grade_level: string;
  enrollment_status: EnrollmentStatus;
  section_id: string | null;
  section?: Section | null;
  guardians?: Guardian[];
}

export type RiskFactor = "low_attendance" | "grade_decline";
export type RiskStatus = "pending" | "reviewed" | "resolved";

export interface RiskAlert {
  id: string;
  student_id: string;
  risk_factors: RiskFactor[];
  attendance_rate: number;
  grade_drop_percentage: number;
  status: RiskStatus;
  created_at: string;
  reviewed_at: string | null;
  notes: string | null;
  counselor_id?: string;
  student?: Pick<Student, "id" | "first_name" | "last_name" | "grade_level"> | null;
}

export interface BroadcastResult {
  id: string;
  message: string;
  scope: "all" | "students";
  student_ids: string[] | null;
  total: number;
  email_sent: number;
  sms_sent: number;
  skipped: number;
  sent_at: string;
}

export interface DashboardStats {
  leads_total: number;
  leads_by_stage: Record<LeadStatus, number>;
  leads_active: number;
  students_total: number;
  students_enrolled: number;
  sections_total: number;
  risk_alerts_pending: number;
  risk_alerts_total: number;
  broadcasts_sent: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: { total: number; per_page?: number; current_page?: number };
}

export interface ApiResource<T> {
  data: T;
}
