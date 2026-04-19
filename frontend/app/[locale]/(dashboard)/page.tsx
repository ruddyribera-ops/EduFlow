"use client";

import useSWR from "swr";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
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
  locale,
}: {
  label: string;
  value: number | string;
  sub?: string;
  href?: string;
  accent?: string;
  locale: string;
}) {
  const content = (
    <div className={`bg-white border border-slate-200 rounded-lg p-5 ${href ? "hover:border-slate-400 hover:shadow-sm transition" : ""}`}>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${accent || "text-slate-900"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
  return href ? (
    <Link href={`/${locale}${href}`}>{content}</Link>
  ) : (
    content
  );
}

export default function DashboardHome() {
  const locale = useLocale();
  const t = useTranslations();
  const { data, error, isLoading } = useSWR<ApiResource<DashboardStats>>("/stats", swrFetcher);

  if (isLoading) return <div className="p-6 text-slate-500">{t("common.loading")}</div>;
  if (error) return <div className="p-6 text-red-600">{t("common.error")}: {error.message}</div>;
  if (!data) return null;

  const s = data.data;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("dashboard.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("dashboard.activeLeads")}
          value={s.leads_active}
          sub={`${s.leads_total} ${t("dashboard.totalInPipeline")}`}
          href="/admissions"
          locale={locale}
        />
        <StatCard
          label={t("dashboard.enrolledStudents")}
          value={s.students_enrolled}
          sub={`${s.students_total} ${t("dashboard.totalStudents")}`}
          href="/students"
          locale={locale}
        />
        <StatCard
          label={t("dashboard.sections")}
          value={s.sections_total}
          sub={t("dashboard.currentSemester")}
          href="/sections"
          locale={locale}
        />
        <StatCard
          label={t("dashboard.pendingRiskAlerts")}
          value={s.risk_alerts_pending}
          sub={`${s.risk_alerts_total} ${t("dashboard.totalAlerts")}`}
          href="/risk-alerts"
          locale={locale}
          accent={s.risk_alerts_pending > 0 ? "text-red-600" : "text-slate-900"}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">{t("dashboard.pipeline")}</h2>
          <Link href={`/${locale}/admissions`} className="text-sm text-slate-600 hover:text-slate-900">
            {t("dashboard.openKanban")}
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
        <h2 className="font-semibold text-slate-900 mb-3">{t("dashboard.quickActions")}</h2>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${locale}/broadcast`} className="text-sm bg-slate-900 text-white px-3 py-2 rounded hover:bg-slate-800">
            {t("dashboard.sendBroadcast")}
          </Link>
          <Link href={`/${locale}/risk-alerts?status=pending`} className="text-sm border border-slate-300 px-3 py-2 rounded hover:bg-slate-50">
            {t("dashboard.reviewAlerts")}
          </Link>
          <Link href={`/${locale}/students`} className="text-sm border border-slate-300 px-3 py-2 rounded hover:bg-slate-50">
            {t("dashboard.browseStudents")}
          </Link>
        </div>
      </div>
    </div>
  );
}
