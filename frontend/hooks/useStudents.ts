import useSWR, { mutate } from "swr";
import { apiFetch, swrFetcher } from "@/lib/api";
import type { ApiListResponse, Student, EnrollmentStatus } from "@/types";

type StudentsResponse = ApiListResponse<Student>;
const KEY = "/students";

export interface CreateStudentPayload {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  grade_level: string;
  enrollment_status: EnrollmentStatus;
  section_id?: string;
}

export interface UpdateStudentPayload {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  grade_level?: string;
  enrollment_status?: EnrollmentStatus;
  section_id?: string;
}

export function useStudents() {
  const { data, error, isLoading } = useSWR<StudentsResponse>(KEY, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  async function create(payload: CreateStudentPayload): Promise<Student> {
    const created = await apiFetch<Student>("/students", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    mutate(KEY);
    return created;
  }

  async function updateStudent(studentId: string, payload: UpdateStudentPayload): Promise<Student> {
    const updated = await apiFetch<Student>(`/students/${studentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    mutate(KEY);
    return updated;
  }

  async function remove(studentId: string): Promise<void> {
    await apiFetch(`/students/${studentId}`, { method: "DELETE" });
    mutate(KEY);
  }

  return {
    students: data?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    create,
    updateStudent,
    remove,
  };
}
