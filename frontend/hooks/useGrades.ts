import useSWR, { mutate } from "swr";
import { apiFetch, swrFetcher } from "@/lib/api";

export type GradeType = "exam" | "homework" | "project" | "quiz" | "participation";

export interface GradeRecord {
  id: string;
  student_id: string;
  student_name: string | null;
  section_id: string;
  section_name: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
  date: string;
  score: number;
  max_score: number;
  percentage: number | null;
  type: GradeType;
  notes: string | null;
}

export interface CreateGradePayload {
  student_id: string;
  section_id: string;
  date: string;
  score: number;
  max_score: number;
  type: GradeType;
  notes?: string;
}

export interface UpdateGradePayload {
  student_id?: string;
  section_id?: string;
  date?: string;
  score?: number;
  max_score?: number;
  type?: GradeType;
  notes?: string;
}

interface GradesResponse {
  data: GradeRecord[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface GradeFilters {
  section_id?: string | null;
  student_id?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  type?: GradeType | null;
}

function buildKey(filters: GradeFilters): string | null {
  const params = new URLSearchParams();
  if (filters.section_id) params.set("section_id", filters.section_id);
  if (filters.student_id) params.set("student_id", filters.student_id);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.type) params.set("type", filters.type);
  const qs = params.toString();
  return qs ? `/grades?${qs}` : "/grades";
}

export function useGrades(filters: GradeFilters = {}) {
  const key = buildKey(filters);

  const { data, error, isLoading } = useSWR<GradesResponse>(key, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  async function create(payload: CreateGradePayload): Promise<GradeRecord> {
    const created = await apiFetch<{ data: GradeRecord }>("/grades", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    mutate(key);
    return created.data;
  }

  async function update(gradeId: string, payload: UpdateGradePayload): Promise<GradeRecord> {
    const updated = await apiFetch<{ data: GradeRecord }>(`/grades/${gradeId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    mutate(key);
    return updated.data;
  }

  async function remove(gradeId: string): Promise<void> {
    await apiFetch(`/grades/${gradeId}`, { method: "DELETE" });
    mutate(key);
  }

  return {
    grades: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    error: error?.message ?? null,
    create,
    update,
    remove,
  };
}