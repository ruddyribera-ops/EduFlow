import useSWR, { mutate } from "swr";
import { apiFetch, swrFetcher } from "@/lib/api";
import type { ApiListResponse, Lead, LeadStatus } from "@/types";

type LeadsResponse = ApiListResponse<Lead>;
const KEY = "/leads";

export function useLeads() {
  const { data, error, isLoading } = useSWR<LeadsResponse>(KEY, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const leads: Lead[] = data?.data ?? [];

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
    updateLeadStatus,
  };
}
