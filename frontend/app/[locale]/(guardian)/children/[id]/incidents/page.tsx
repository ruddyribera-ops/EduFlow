"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import type { Incident } from "@/hooks/useIncidents";

const TYPE_COLORS: Record<string, string> = {
  medical: "bg-blue-100 text-blue-700",
  behavioral: "bg-purple-100 text-purple-700",
  late_arrival: "bg-amber-100 text-amber-700",
  early_dismissal: "bg-orange-100 text-orange-700",
  visitor: "bg-slate-100 text-slate-600",
  other: "bg-slate-100 text-slate-600",
};

const SEVERITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

interface ChildIncidentsResponse {
  data: Incident[];
}

export default function GuardianChildIncidentsPage() {
  const t = useTranslations("guardian");
  const tIncidents = useTranslations("incidents");
  const pathname = usePathname();
  const childId = pathname.split("/").filter(Boolean).pop() ?? "";

  const { data, isLoading } = useSWR<ChildIncidentsResponse>(
    `/guardian/children/${childId}/incidents`,
    swrFetcher
  );

  const incidents = data?.data ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("incidents")}</h1>
      </div>

      {isLoading && <div className="text-slate-500">{t("loading")}</div>}

      {!isLoading && incidents.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-8 text-center text-slate-500">
          {t("noIncidents")}
        </div>
      )}

      {!isLoading && incidents.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("date")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("type")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("severity")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("description")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600 text-xs">
                    {incident.occurred_at
                      ? new Date(incident.occurred_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[incident.type] ?? "bg-slate-100 text-slate-600"}`}>
                      {incident.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[incident.severity] ?? "bg-slate-100 text-slate-600"}`}>
                      {incident.severity}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate">
                    {incident.description ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {incident.is_resolved ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Resolved</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">Open</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
