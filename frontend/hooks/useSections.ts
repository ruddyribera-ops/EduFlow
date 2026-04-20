import useSWR, { mutate } from "swr";
import { apiFetch, swrFetcher } from "@/lib/api";
import type { ApiListResponse, Section } from "@/types";

type SectionsResponse = ApiListResponse<Section>;
const KEY = "/sections";

export interface CreateSectionPayload {
  name: string;
  grade_level: string;
  room?: string;
  semester: "fall" | "spring" | "summer";
  counselor_id?: string;
}

export interface UpdateSectionPayload {
  name?: string;
  grade_level?: string;
  room?: string;
  semester?: "fall" | "spring" | "summer";
  counselor_id?: string;
}

export function useSections() {
  const { data, error, isLoading } = useSWR<SectionsResponse>(KEY, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  async function create(payload: CreateSectionPayload): Promise<Section> {
    const created = await apiFetch<Section>("/sections", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    mutate(KEY);
    return created;
  }

  async function updateSection(sectionId: string, payload: UpdateSectionPayload): Promise<Section> {
    const updated = await apiFetch<Section>(`/sections/${sectionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    mutate(KEY);
    return updated;
  }

  async function remove(sectionId: string): Promise<void> {
    await apiFetch(`/sections/${sectionId}`, { method: "DELETE" });
    mutate(KEY);
  }

  async function assignTeacher(sectionId: string, teacherId: string): Promise<void> {
    await apiFetch(`/sections/${sectionId}/teachers/${teacherId}`, { method: "POST" });
    mutate(KEY);
  }

  async function removeTeacher(sectionId: string, teacherId: string): Promise<void> {
    await apiFetch(`/sections/${sectionId}/teachers/${teacherId}`, { method: "DELETE" });
    mutate(KEY);
  }

  async function assignStudent(sectionId: string, studentId: string): Promise<void> {
    await apiFetch(`/sections/${sectionId}/students/${studentId}`, { method: "POST" });
    mutate(KEY);
  }

  async function removeStudent(sectionId: string, studentId: string): Promise<void> {
    await apiFetch(`/sections/${sectionId}/students/${studentId}`, { method: "DELETE" });
    mutate(KEY);
  }

  return {
    sections: data?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    create,
    updateSection,
    remove,
    assignTeacher,
    removeTeacher,
    assignStudent,
    removeStudent,
  };
}
