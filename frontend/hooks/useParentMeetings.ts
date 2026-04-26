import useSWR, { mutate } from "swr";
import { apiFetch, swrFetcher } from "@/lib/api";
import type { ApiListResponse } from "@/types";

export interface ParentMeeting {
  id: string;
  student_id: string;
  student_name?: string;
  meeting_date: string;
  tutor_name: string | null;
  day_time: string | null;
  attendees: string | null;
  modality: "in_person" | "virtual" | "phone" | null;
  confirmation: "pending" | "confirmed" | "cancelled" | null;
  observation: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
}

type MeetingsResponse = ApiListResponse<ParentMeeting>;

export interface CreateMeetingPayload {
  student_id: string;
  meeting_date: string;
  tutor_name?: string;
  day_time?: string;
  attendees?: string;
  modality?: "in_person" | "virtual" | "phone";
  confirmation?: "pending" | "confirmed" | "cancelled";
  observation?: string;
}

export interface UpdateMeetingPayload extends Partial<CreateMeetingPayload> {}

export function useParentMeetings(filters?: {
  student_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.student_id) params.set("student_id", filters.student_id);
  if (filters?.date_from) params.set("date_from", filters.date_from);
  if (filters?.date_to) params.set("date_to", filters.date_to);

  const key = `/parent-meetings${params.toString() ? `?${params.toString()}` : ""}`;

  const { data, error, isLoading } = useSWR<MeetingsResponse>(key, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  async function create(payload: CreateMeetingPayload): Promise<ParentMeeting> {
    const created = await apiFetch<ParentMeeting>("/parent-meetings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    mutate(key);
    return created;
  }

  async function update(
    id: string,
    payload: UpdateMeetingPayload
  ): Promise<ParentMeeting> {
    const updated = await apiFetch<ParentMeeting>(`/parent-meetings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    mutate(key);
    return updated;
  }

  async function remove(id: string): Promise<void> {
    await apiFetch<void>(`/parent-meetings/${id}`, { method: "DELETE" });
    mutate(key);
  }

  return {
    meetings: data?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    meta: data?.meta,
    create,
    update,
    remove,
  };
}
