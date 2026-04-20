import useSWR, { mutate } from "swr";
import { apiFetch, swrFetcher } from "@/lib/api";
import type { ApiListResponse, Lead, LeadStatus } from "@/types";

type LeadsResponse = ApiListResponse<Lead>;
const KEY = "/leads";

export interface CreateLeadPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  source_campaign?: string;
  notes?: string;
  assigned_counselor_id?: string;
}

export interface UpdateLeadPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  source_campaign?: string;
  notes?: string;
  assigned_counselor_id?: string;
}

export function useLeads() {
  const { data, error, isLoading } = useSWR<LeadsResponse>(KEY, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const leads: Lead[] = data?.data ?? [];

  async function create(payload: CreateLeadPayload): Promise<Lead> {
    const created = await apiFetch<Lead>("/leads", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    mutate(KEY);
    return created;
  }

  async function updateLead(leadId: string, payload: UpdateLeadPayload): Promise<Lead> {
    const updated = await apiFetch<Lead>(`/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    mutate(KEY);
    return updated;
  }

  async function remove(leadId: string): Promise<void> {
    await apiFetch(`/leads/${leadId}`, { method: "DELETE" });
    mutate(KEY);
  }

  const updateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    const previous = data;

    mutate(
      KEY,
      (current: LeadsResponse | undefined) => {
        if (!current) return { data: [], meta: { total: 0 } };
        return {
          ...current,
          data: current.data.map((l) =>
            l.id === leadId ? { ...l, status: newStatus } : l
          ),
        };
      },
      false
    );

    try {
      await apiFetch(`/leads/${leadId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      mutate(KEY);
    } catch (err) {
      mutate(KEY, previous, false);
      throw err;
    }
  };

  return {
    leads,
    isLoading,
    error: error?.message ?? null,
    create,
    updateLead,
    remove,
    updateLeadStatus,
  };
}
