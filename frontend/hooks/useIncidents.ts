import useSWR, { mutate } from "swr";
import { apiFetch, swrFetcher } from "@/lib/api";
import type { ApiListResponse, Student } from "@/types";

export type IncidentType = "medical" | "behavioral" | "late_arrival" | "early_dismissal" | "visitor" | "other";
export type IncidentSeverity = "low" | "medium" | "high";

export interface Incident {
  id: string;
  student_id: string;
  student_name: string | null;
  grade_level: string | null;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string | null;
  occurred_at: string | null;
  resolved_at: string | null;
  reporter_name: string | null;
  resolver_name: string | null;
  resolution_notes: string | null;
  notify_coordinator: boolean;
  is_resolved: boolean;
  created_at: string;
}

type IncidentsResponse = ApiListResponse<Incident>;

export interface CreateIncidentPayload {
  student_id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description?: string;
  occurred_at: string;
  notify_coordinator?: boolean;
}

export interface ResolveIncidentPayload {
  resolved_at: string;
  resolution_notes?: string;
  notify_coordinator?: boolean;
}

export function useIncidents(filters?: {
  status?: "open" | "resolved";
  severity?: IncidentSeverity;
  type?: IncidentType;
  student_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.severity) params.set("severity", filters.severity);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.student_id) params.set("student_id", filters.student_id);
  if (filters?.date_from) params.set("date_from", filters.date_from);
  if (filters?.date_to) params.set("date_to", filters.date_to);

  const key = `/incidents${params.toString() ? `?${params.toString()}` : ""}`;

  const { data, error, isLoading } = useSWR<IncidentsResponse>(key, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  async function create(payload: CreateIncidentPayload): Promise<Incident> {
    const created = await apiFetch<Incident>("/incidents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    mutate(key);
    return created;
  }

  async function resolve(incidentId: string, payload: ResolveIncidentPayload): Promise<Incident> {
    const resolved = await apiFetch<Incident>(`/incidents/${incidentId}/resolve`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    mutate(key);
    return resolved;
  }

  return {
    incidents: data?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    meta: data?.meta,
    create,
    resolve,
  };
}