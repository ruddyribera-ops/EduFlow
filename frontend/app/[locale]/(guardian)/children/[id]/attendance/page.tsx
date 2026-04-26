"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  tardy: "bg-amber-100 text-amber-700",
  excused: "bg-slate-100 text-slate-600",
};

interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: string;
  notes: string | null;
}

interface AttendanceResponse {
  data: AttendanceRecord[];
}

export default function GuardianChildAttendancePage() {
  const t = useTranslations("guardian");
  const pathname = usePathname();
  const childId = pathname.split("/").filter(Boolean).pop() ?? "";

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const params = new URLSearchParams();
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  const qs = params.toString();

  const { data, isLoading } = useSWR<AttendanceResponse>(
    `/guardian/children/${childId}/attendance${qs ? `?${qs}` : ""}`,
    swrFetcher
  );

  const records = data?.data ?? [];

  const summary = {
    present: records.filter((r) => r.status === "present").length,
    absent: records.filter((r) => r.status === "absent").length,
    tardy: records.filter((r) => r.status === "tardy").length,
    excused: records.filter((r) => r.status === "excused").length,
  };
  const total = records.length || 1;
  const pct = (s: number) => Math.round((s / total) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">{t("attendance")}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-lg p-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("dateFrom")}</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("dateTo")}</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Summary badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: "present", label: "Present", count: summary.present },
          { key: "absent", label: "Absent", count: summary.absent },
          { key: "tardy", label: "Tardy", count: summary.tardy },
          { key: "excused", label: "Excused", count: summary.excused },
        ].map(({ key, label, count }) => (
          <div key={key} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-900">{count}</div>
            <div className={`text-xs font-medium mt-1 ${STATUS_COLORS[key]}`}>{label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{pct(count)}%</div>
          </div>
        ))}
      </div>

      {isLoading && <div className="text-slate-500">{t("loading")}</div>}

      {!isLoading && records.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-8 text-center text-slate-500">
          {t("noAttendance")}
        </div>
      )}

      {!isLoading && records.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("date")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("status")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("notes")}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600 text-xs">
                    {record.date ? new Date(record.date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[record.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{record.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
