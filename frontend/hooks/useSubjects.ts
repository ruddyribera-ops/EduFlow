import useSWR from "swr";
import { swrFetcher } from "@/lib/api";

export interface Subject {
  id: string;
  name: string;
  code: string;
  area: string | null;
  campo: string | null;
  level: string;
}

interface SubjectsResponse {
  data: Subject[];
}

export function useSubjects() {
  const { data, error, isLoading } = useSWR<SubjectsResponse>("/subjects", swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  return {
    subjects: data?.data ?? [],
    isLoading,
    error: error?.message ?? null,
  };
}