import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import type { ApiResource } from "@/types";

/* ─── Shared stat shapes ─────────────────────────────────────────────── */

export interface AttendanceToday {
  total: number;
  present: number;
  absent: number;
  tardy: number;
  excused: number;
  present_rate: number;
}

export interface IncidentsThisWeek {
  total: number;
  open: number;
}

export interface GradeSummary {
  total_records: number;
  avg_percentage: number | null;
  failing_count: number;
}

export interface SectionAttendanceRow {
  name: string;
  grade_level: string;
  total_students: number;
  present: number;
  absent: number;
  attendance_rate: number;
}

export interface UpcomingMeeting {
  id: string;
  student_name: string | null;
  meeting_date: string | null;
  day_time: string | null;
  modality: string | null;
  confirmation: string | null;
}

/* ─── Full dashboard snapshot ─────────────────────────────────────────── */

export interface DashboardStats {
  leads_total: number;
  leads_by_stage: Record<string, number>;
  leads_active: number;
  students_total: number;
  students_enrolled: number;
  sections_total: number;
  risk_alerts_pending: number;
  risk_alerts_total: number;
  risk_by_status: Record<string, number>;
  attendance_today: AttendanceToday;
  incidents_this_week: IncidentsThisWeek;
  grade_summary: GradeSummary;
  enrollment_by_month: number[]; // 12 entries, Jan–Dec
  section_attendance: SectionAttendanceRow[];
  upcoming_meetings: UpcomingMeeting[];
  broadcasts_sent: number;
}

/* ─── Hooks ───────────────────────────────────────────────────────────── */

export function useStats() {
  const { data, error, isLoading } = useSWR<ApiResource<DashboardStats>>(
    "/stats",
    swrFetcher,
    { revalidateOnFocus: true, refreshInterval: 300_000 }
  );

  return {
    stats: data?.data ?? null,
    isLoading,
    error: error?.message ?? null,
  };
}

export function useEnrollmentTrend() {
  const { data, isLoading } = useSWR<ApiResource<number[]>>(
    "/stats/enrollment-over-time",
    swrFetcher
  );
  return { data: data?.data ?? [], isLoading };
}

export function useAttendanceTrend() {
  const { data, isLoading } = useSWR<
    ApiResource<Array<{ date: string; rate: number | null }>>
  >("/stats/attendance-trend", swrFetcher);
  return { data: data?.data ?? [], isLoading };
}

export function useIncidentTrend() {
  const { data, isLoading } = useSWR<ApiResource<Record<string, number>>>(
    "/stats/incident-trend",
    swrFetcher
  );
  return { data: data?.data ?? {}, isLoading };
}
