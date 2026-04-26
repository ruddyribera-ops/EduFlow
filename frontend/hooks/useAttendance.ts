import useSWR, { mutate } from "swr";
import { apiFetch, swrFetcher } from "@/lib/api";
import type { Section } from "@/types";

export type AttendanceStatus = "present" | "absent" | "tardy" | "excused";

export interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string | null;
  grade_level: string | null;
  status: AttendanceStatus;
  notes: string | null;
  marked_by_user_id: string | null;
  marked_at: string | null;
}

interface AttendanceResponse {
  data: AttendanceRecord[];
  meta: {
    section_id: string;
    date: string;
    total: number;
  };
}

export interface BatchAttendancePayload {
  section_id: string;
  date: string;
  records: Array<{
    student_id: string;
    status: AttendanceStatus;
    notes?: string;
  }>;
}

interface BatchResponse {
  data: AttendanceRecord[];
  meta: {
    section_id: string;
    date: string;
    total: number;
    present: number;
    absent: number;
    tardy: number;
    excused: number;
  };
}

export function useAttendance(sectionId: string | null, date: string) {
  const key = sectionId && date ? `/attendances?section_id=${sectionId}&date=${date}` : null;

  const { data, error, isLoading } = useSWR<AttendanceResponse>(key, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  async function batch(payload: BatchAttendancePayload): Promise<BatchResponse> {
    const result = await apiFetch<BatchResponse>("/attendances/batch", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (key) mutate(key);
    return result;
  }

  async function updateRecord(attendanceId: string, payload: { status?: AttendanceStatus; notes?: string }) {
    const updated = await apiFetch<{ data: AttendanceRecord }>(`/attendances/${attendanceId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (key) mutate(key);
    return updated.data;
  }

  return {
    records: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    error: error?.message ?? null,
    batch,
    updateRecord,
  };
}