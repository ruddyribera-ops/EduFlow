import useSWR, { mutate } from "swr";
import { apiFetch, swrFetcher } from "@/lib/api";
import type { ApiListResponse, Guardian } from "@/types";

type GuardiansResponse = ApiListResponse<Guardian>;
const KEY = "/guardians";

export interface CreateGuardianPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  communication_preference: "email_only" | "sms_only" | "both";
}

export interface UpdateGuardianPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  communication_preference?: "email_only" | "sms_only" | "both";
}

export interface AttachGuardianPayload {
  guardian_id: string;
  relationship_type: string;
  is_emergency_contact?: boolean;
  can_pickup?: boolean;
}

export function useGuardians() {
  const { data, error, isLoading } = useSWR<GuardiansResponse>(KEY, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  async function create(payload: CreateGuardianPayload): Promise<Guardian> {
    const created = await apiFetch<Guardian>("/guardians", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    mutate(KEY);
    return created;
  }

  async function updateGuardian(guardianId: string, payload: UpdateGuardianPayload): Promise<Guardian> {
    const updated = await apiFetch<Guardian>(`/guardians/${guardianId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    mutate(KEY);
    return updated;
  }

  async function remove(guardianId: string): Promise<void> {
    await apiFetch(`/guardians/${guardianId}`, { method: "DELETE" });
    mutate(KEY);
  }

  async function attachToStudent(
    studentId: string,
    payload: AttachGuardianPayload
  ): Promise<Guardian[]> {
    const attached = await apiFetch<Guardian[]>(`/students/${studentId}/guardians`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    mutate(KEY);
    return attached;
  }

  async function detachFromStudent(studentId: string, guardianId: string): Promise<void> {
    await apiFetch(`/students/${studentId}/guardians/${guardianId}`, {
      method: "DELETE",
    });
    mutate(KEY);
  }

  return {
    guardians: data?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    create,
    updateGuardian,
    remove,
    attachToStudent,
    detachFromStudent,
  };
}
