import useSWR, { mutate } from "swr";
import type { Lead, LeadStatus, ApiListResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type LeadsResponse = ApiListResponse<Lead>;

const fetcher = async (url: string): Promise<LeadsResponse> => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch leads (HTTP ${res.status})`);
  return res.json();
};

export function useLeads() {
  const { data, error, isLoading } = useSWR<LeadsResponse>(`${API_BASE}/leads`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const leads: Lead[] = data?.data ?? [];

  const updateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    const previous = data;

    mutate(
      `${API_BASE}/leads`,
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
      const res = await fetch(`${API_BASE}/leads/${leadId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error(`Failed to update lead (HTTP ${res.status})`);

      mutate(`${API_BASE}/leads`);
    } catch (err) {
      mutate(`${API_BASE}/leads`, previous, false);
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
