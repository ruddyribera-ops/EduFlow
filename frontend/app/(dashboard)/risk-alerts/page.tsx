"use client";

import useSWR, { mutate } from "swr";
import { useState } from "react";
import Link from "next/link";
import { apiFetch, swrFetcher, ApiError } from "@/lib/api";
import type { ApiListResponse, ApiResource, RiskAlert, RiskFactor, RiskStatus } from "@/types";

const FACTOR_LABEL: Record<RiskFactor, string> = {
  low_attendance: "Low attendance",
  grade_decline: "Grade decline",
};

const STATUS_BADGE: Record<RiskStatus, string> = {
  pending: "bg-red-100 text-red-700",
  reviewed: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
};

export default function RiskAlertsPage() {
  const [filter, setFilter] = useState<"" | RiskStatus>("");
  const key = `/risk-alerts${filter ? `?status=${filter}` : ""}`;
  const { data, error, isLoading } = useSWR<ApiListResponse<RiskAlert>>(key, swrFetcher);
  const [updating, setUpdating] = useState<string | null>(null);

  async function updateStatus(id: string, status: RiskStatus) {
    setUpdating(id);
    try {
      await apiFetch<ApiResource<RiskAlert>>(`/risk-alerts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      mutate(key);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Risk Alerts</h1>
          <p className="text-sm text-slate-500 mt-1">AI-flagged students needing attention</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "" | RiskStatus)}
          className="border border-slate-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {isLoading && <div className="text-slate-500">Loading…</div>}
      {error && <div className="text-red-600">Error: {error.message}</div>}

      {data && (
        <div className="space-y-3">
          {data.data.map((alert) => (
            <div key={alert.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[alert.status]}`}>
                      {alert.status}
                    </span>
                    {alert.student && (
                      <Link href={`/students/${alert.student.id}`} className="font-semibold text-slate-900 hover:underline">
                        {alert.student.first_name} {alert.student.last_name}
                      </Link>
                    )}
                    {alert.student && <span className="text-sm text-slate-500">· {alert.student.grade_level}</span>}
                  </div>

                  <div className="mt-2 flex gap-2 flex-wrap">
                    {alert.risk_factors.map((f) => (
                      <span key={f} className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded">
                        {FACTOR_LABEL[f]}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 text-sm text-slate-600 space-x-4">
                    <span>Attendance: <strong>{(alert.attendance_rate * 100).toFixed(0)}%</strong></span>
                    {alert.grade_drop_percentage > 0 && (
                      <span>Grade drop: <strong>-{(alert.grade_drop_percentage * 100).toFixed(0)}%</strong></span>
                    )}
                  </div>

                  {alert.notes && (
                    <div className="mt-2 text-sm text-slate-700 bg-slate-50 rounded p-2">
                      {alert.notes}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-slate-400">
                    Detected {new Date(alert.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  {alert.status === "pending" && (
                    <button
                      disabled={updating === alert.id}
                      onClick={() => updateStatus(alert.id, "reviewed")}
                      className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700 disabled:opacity-50"
                    >
                      Mark reviewed
                    </button>
                  )}
                  {alert.status !== "resolved" && (
                    <button
                      disabled={updating === alert.id}
                      onClick={() => updateStatus(alert.id, "resolved")}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {data.data.length === 0 && (
            <div className="text-center text-slate-500 py-8">No alerts.</div>
          )}
        </div>
      )}
    </div>
  );
}
