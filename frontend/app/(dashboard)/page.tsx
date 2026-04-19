"use client";

import useSWR from "swr";
import Link from "next/link";
import { swrFetcher } from "@/lib/api";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/constants";
import type { ApiResource, DashboardStats, LeadStatus } from "@/types";

const PIPELINE: LeadStatus[] = ["inquiry", "tour_scheduled", "application_sent", "enrolled", "lost"];

function StatCard({
  label,
  value,
  sub,
  href,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  href?: string;
  accent?: string;
}) {
  const content = (
    <div className={`bg-white border border-slate-200 rounded-lg p-5 ${href ? "hover:border-slate-400 hover:shadow-sm transition" : ""}`}>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${accent || "text-slate-900"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardHome() {
  const { data, error, isLoading } = useSWR<ApiResource<DashboardStats>>("/stats", swrFetcher);

  if (isLoading) return <div className="p-6 text-slate-500">Loading dashboard…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;
  if (!data) return null;

  const s = data.data;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">School-wide overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Leads" value={s.leads_active} sub={`${s.leads_total} total in pipeline`} href="/admissions" />
        <StatCard label="Enrolled Students" value={s.students_enrolled} sub={`${s.students_total} total students`} href="/students" />
        <StatCard label="Sections" value={s.sections_total} sub="Current semester" href="/sections" />
        <StatCard
          label="Pending Risk Alerts"
          value={s.risk_alerts_pending}
          sub={`${s.risk_alerts_total} total alerts`}
          href="/risk-alerts"
          accent={s.risk_alerts_pending > 0 ? "text-red-600" : "text-slate-900"}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Admissions Pipeline</h2>
          <Link href="/admissions" className="text-sm text-slate-600 hover:text-slate-900">
            Open Kanban →
          </Link>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {PIPELINE.map((stage) => (
            <div key={stage} className={`rounded border-2 p-3 ${STAGE_COLORS[stage]}`}>
              <div className="text-xs font-semibold text-slate-700">{STAGE_LABELS[stage]}</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{s.leads_by_stage[stage] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/broadcast" className="text-sm bg-slate-900 text-white px-3 py-2 rounded hover:bg-slate-800">
            Send Emergency Broadcast
          </Link>
          <Link href="/risk-alerts?status=pending" className="text-sm border border-slate-300 px-3 py-2 rounded hover:bg-slate-50">
            Review Pending Alerts
          </Link>
          <Link href="/students" className="text-sm border border-slate-300 px-3 py-2 rounded hover:bg-slate-50">
            Browse Students
          </Link>
        </div>
      </div>
    </div>
  );
}
