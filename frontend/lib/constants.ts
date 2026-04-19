import type { LeadStatus } from "@/types";

export const PIPELINE_STAGES: readonly LeadStatus[] = [
  "inquiry",
  "tour_scheduled",
  "application_sent",
  "enrolled",
  "lost",
] as const;

export const STAGE_LABELS: Record<LeadStatus, string> = {
  inquiry: "Inquiry",
  tour_scheduled: "Tour Scheduled",
  application_sent: "Application Sent",
  enrolled: "Enrolled",
  lost: "Lost",
};

export const STAGE_COLORS: Record<LeadStatus, string> = {
  inquiry: "bg-blue-50 border-blue-200",
  tour_scheduled: "bg-yellow-50 border-yellow-200",
  application_sent: "bg-purple-50 border-purple-200",
  enrolled: "bg-green-50 border-green-200",
  lost: "bg-red-50 border-red-200",
};
