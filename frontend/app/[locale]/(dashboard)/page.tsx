"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useStats, useEnrollmentTrend, useAttendanceTrend, useIncidentTrend } from "@/hooks/useStats";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/constants";
import type { LeadStatus } from "@/types";

const PIPELINE: LeadStatus[] = ["inquiry", "tour_scheduled", "application_sent", "enrolled", "lost"];
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function attendanceColor(rate: number): string {
  if (rate >= 85) return "text-green-600";
  if (rate >= 70) return "text-amber-600";
  return "text-red-600";
}

function attendanceBg(rate: number): string {
  if (rate >= 85) return "bg-green-50 border-green-200";
  if (rate >= 70) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function rateBarColor(rate: number): string {
  if (rate >= 85) return "bg-green-500";
  if (rate >= 70) return "bg-amber-500";
  return "bg-red-500";
}

function ModalityBadge({ modality }: { modality: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    in_person:  { label: "In Person",  cls: "bg-blue-100 text-blue-700" },
    virtual:    { label: "Virtual",    cls: "bg-purple-100 text-purple-700" },
    phone:      { label: "Phone",      cls: "bg-slate-100 text-slate-700" },
  };
  const info = modality ? map[modality] : null;
  if (!info) return null;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${info.cls}`}>
      {info.label}
    </span>
  );
}

/* ─── Custom SVG Charts ───────────────────────────────────────────────── */

function SimpleBarChart({
  data,
  maxValue,
  colorClass,
  height = 120,
}: {
  data: number[];
  maxValue: number;
  colorClass: string;
  height?: number;
}) {
  const w = 400;
  const barW = Math.max(4, Math.floor((w - 40) / data.length) - 4);
  const max = maxValue || 1;
  const chartH = height - 24; // leave room for labels

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full overflow-visible" style={{ display: "block" }}>
      {data.map((val, i) => {
        const barH = Math.max(2, (val / max) * chartH);
        const x = 20 + i * (barW + 4);
        const y = chartH - barH + 4;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={barH}
            rx={2}
            className={colorClass}
            opacity={val === 0 ? 0.3 : 1}
          />
        );
      })}
      {/* baseline */}
      <line x1="20" y1={chartH + 4} x2={20 + data.length * (barW + 4) - 4} y2={chartH + 4} stroke="#cbd5e1" strokeWidth="1" />
    </svg>
  );
}

function SimpleLineChart({
  data,
  maxRate = 100,
  height = 120,
}: {
  data: Array<{ date: string; rate: number | null }>;
  maxRate?: number;
  height?: number;
}) {
  if (data.length === 0) {
    return <div className="h-28 flex items-center justify-center text-sm text-slate-400">{/* no data */}</div>;
  }
  const w = 400;
  const chartH = height - 28;
  const paddingX = 8;
  const innerW = w - paddingX * 2;
  const stepX = innerW / Math.max(data.length - 1, 1);

  // Build path only from non-null points
  const points = data
    .map((d, i) => ({ x: paddingX + i * stepX, y: d.rate !== null ? chartH - (d.rate / maxRate) * chartH + 4 : null, rate: d.rate }))
    .filter(p => p.y !== null) as Array<{ x: number; y: number; rate: number }>;

  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Smooth step
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      pathD += ` C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
    }
  }

  // Area fill
  let areaD = pathD
    + ` L ${points[points.length - 1]?.x ?? w} ${chartH + 4}`
    + ` L ${paddingX} ${chartH + 4} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full overflow-visible" style={{ display: "block" }}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map(pct => {
        const y = chartH - (pct / maxRate) * chartH + 4;
        return (
          <g key={pct}>
            <line x1={paddingX} y1={y} x2={w - paddingX} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={paddingX - 2} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{pct}%</text>
          </g>
        );
      })}
      {/* Area */}
      {pathD && (
        <path d={areaD} fill="#3b82f6" opacity="0.10" />
      )}
      {/* Line */}
      {pathD && (
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
      )}
      {/* Dots on points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3b82f6" />
      ))}
    </svg>
  );
}

/* ─── KPI Card ───────────────────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  sub,
  accentCls,
  href,
  locale,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accentCls?: string;
  href?: string;
  locale: string;
}) {
  const inner = (
    <div className={`bg-white border border-slate-200 rounded-lg p-5 ${href ? "hover:border-slate-400 hover:shadow-sm transition cursor-pointer" : ""}`}>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${accentCls ?? "text-slate-900"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
  return href ? <Link href={`/${locale}${href}`}>{inner}</Link> : inner;
}

/* ─── Main Dashboard ──────────────────────────────────────────────────── */

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { stats, isLoading, error } = useStats();
  const { data: enrollmentData } = useEnrollmentTrend();
  const { data: attendanceData } = useAttendanceTrend();
  const { data: incidentData } = useIncidentTrend();

  if (isLoading) return <div className="p-6 text-slate-500">{t("common.loading")}</div>;
  if (error) return <div className="p-6 text-red-600">{t("common.error")}: {error.message}</div>;
  if (!stats) return null;

  const s = stats;
  const maxMonth = Math.max(...s.enrollment_by_month, 1);

  // Incidents bar chart data — build from incidents_this_week (no per-type breakdown in dashboard response,
  // so use a simple placeholder showing total vs open)
  const incidentCounts = [
    { label: "Total", value: s.incidents_this_week.total },
    { label: "Open",  value: s.incidents_this_week.open },
  ];

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("dashboard.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("dashboard.subtitle")}</p>
      </div>

      {/* ── Section A: KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label={t("dashboard.totalStudents")}
          value={s.students_enrolled}
          sub={`${s.students_total} ${t("dashboard.enrolled")}`}
          href="/students"
          locale={locale}
        />
        <div
          className={`bg-white border rounded-lg p-5 ${attendanceBg(s.attendance_today.present_rate)}`}
        >
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t("dashboard.attendanceToday")}</div>
          <div className={`mt-2 text-3xl font-bold ${attendanceColor(s.attendance_today.present_rate)}`}>
            {s.attendance_today.present_rate}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {s.attendance_today.present} {t("dashboard.present")} · {s.attendance_today.absent} {t("dashboard.absent")}
          </div>
        </div>
        <KpiCard
          label={t("dashboard.openIncidents")}
          value={s.incidents_this_week.open}
          sub={`${s.incidents_this_week.total} ${t("dashboard.thisWeek")}`}
          href="/incidents"
          locale={locale}
          accentCls={s.incidents_this_week.open > 0 ? "text-red-600" : "text-slate-900"}
        />
        <KpiCard
          label={t("dashboard.riskAlerts")}
          value={s.risk_alerts_pending}
          sub={`${s.risk_alerts_total} ${t("dashboard.totalAlerts")}`}
          href="/risk-alerts"
          locale={locale}
          accentCls={s.risk_alerts_pending > 0 ? "text-red-600" : "text-slate-900"}
        />
        <KpiCard
          label={t("dashboard.activeLeads")}
          value={s.leads_active}
          sub={`${s.leads_total} ${t("dashboard.totalInPipeline")}`}
          href="/admissions"
          locale={locale}
        />
      </div>

      {/* ── Section B: Enrollment Funnel + Grade Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Enrollment Funnel */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-900 mb-4">{t("dashboard.enrollmentFunnel")}</h2>
          {/* Horizontal stacked bar */}
          <div className="flex h-8 rounded-full overflow-hidden shadow-sm mb-4">
            {PIPELINE.map(stage => {
              const count = s.leads_by_stage[stage] ?? 0;
              const total = s.leads_total || 1;
              const pct = Math.round((count / total) * 100);
              if (pct === 0) return null;
              const colorMap: Record<LeadStatus, string> = {
                inquiry:         "bg-blue-400",
                tour_scheduled:  "bg-yellow-400",
                application_sent:"bg-purple-400",
                enrolled:        "bg-green-400",
                lost:            "bg-red-300",
              };
              return (
                <div
                  key={stage}
                  title={`${STAGE_LABELS[stage]}: ${count}`}
                  className={`${colorMap[stage]} flex items-center justify-center text-xs font-bold text-white hover:opacity-80 transition`}
                  style={{ width: `${pct}%`, minWidth: pct > 5 ? 32 : 0 }}
                >
                  {pct > 8 && count}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="grid grid-cols-5 gap-2">
            {PIPELINE.map(stage => (
              <div key={stage} className={`rounded border p-2 ${STAGE_COLORS[stage]}`}>
                <div className="text-xs font-medium text-slate-600">{STAGE_LABELS[stage]}</div>
                <div className="text-xl font-bold text-slate-900">{s.leads_by_stage[stage] ?? 0}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Grade Summary */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-900 mb-4">{t("dashboard.gradeSummary")}</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs text-slate-500 uppercase">{t("dashboard.avgGrade")}</div>
              <div className="text-3xl font-bold text-slate-900 mt-1">
                {s.grade_summary.avg_percentage !== null
                  ? `${s.grade_summary.avg_percentage}%`
                  : "—"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500 uppercase">{t("dashboard.failingGrades")}</div>
              <div className={`text-3xl font-bold mt-1 ${s.grade_summary.failing_count > 0 ? "text-red-600" : "text-slate-900"}`}>
                {s.grade_summary.failing_count}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500 uppercase">{t("dashboard.totalRecords")}</div>
              <div className="text-3xl font-bold text-slate-900 mt-1">{s.grade_summary.total_records}</div>
            </div>
          </div>
          {/* Simple bar: avg vs 100 */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-20">Avg</span>
              <div className="flex-1 bg-slate-100 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full"
                  style={{ width: `${s.grade_summary.avg_percentage ?? 0}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-600 w-10">{s.grade_summary.avg_percentage ?? 0}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-20">Pass&nbsp;(60%+)</span>
              <div className="flex-1 bg-slate-100 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full"
                  style={{
                    width: `${
                      s.grade_summary.total_records > 0
                        ? ((s.grade_summary.total_records - s.grade_summary.failing_count) / s.grade_summary.total_records) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-xs font-medium text-slate-600 w-10">
                {s.grade_summary.total_records > 0
                  ? `${Math.round(((s.grade_summary.total_records - s.grade_summary.failing_count) / s.grade_summary.total_records) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section C: Charts Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Attendance Trend */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-900 mb-3">{t("dashboard.attendanceTrend")}</h2>
          <SimpleLineChart data={attendanceData} maxRate={100} height={140} />
        </div>

        {/* Enrollment by Month */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-900 mb-3">{t("dashboard.enrollmentTrend")}</h2>
          <SimpleBarChart data={s.enrollment_by_month} maxValue={maxMonth} colorClass="fill-blue-500" height={140} />
          <div className="flex justify-between mt-1 px-1">
            {MONTH_LABELS.map(m => (
              <span key={m} className="text-[9px] text-slate-400">{m}</span>
            ))}
          </div>
        </div>

        {/* Incidents This Week (bar: total vs open) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-900 mb-3">{t("dashboard.incidentBreakdown")}</h2>
          <SimpleBarChart
            data={incidentCounts.map(c => c.value)}
            maxValue={Math.max(...incidentCounts.map(c => c.value), 1)}
            colorClass="fill-red-500"
            height={140}
          />
          <div className="flex justify-center gap-6 mt-2">
            {incidentCounts.map(c => (
              <div key={c.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                <span className="text-xs text-slate-500">{c.label}: {c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section D: Meetings + Section Attendance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Upcoming Parent Meetings */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">{t("dashboard.upcomingMeetings")}</h2>
            <Link href={`/${locale}/parent-meetings`} className="text-xs text-slate-500 hover:text-slate-900">
              View all →
            </Link>
          </div>
          {s.upcoming_meetings.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">{t("dashboard.noUpcomingMeetings")}</p>
          ) : (
            <div className="space-y-3">
              {s.upcoming_meetings.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {m.student_name ?? "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {m.meeting_date && new Date(m.meeting_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      {m.day_time ? ` · ${m.day_time}` : ""}
                    </div>
                  </div>
                  {m.modality && <ModalityBadge modality={m.modality} />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section Attendance This Week */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">{t("dashboard.sectionAttendance")}</h2>
            <Link href={`/${locale}/sections`} className="text-xs text-slate-500 hover:text-slate-900">
              View all →
            </Link>
          </div>
          {s.section_attendance.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">{t("dashboard.noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-slate-200">
                    <th className="text-left pb-2 pr-3 font-medium">{t("dashboard.section")}</th>
                    <th className="text-center pb-2 px-2 font-medium">Gr</th>
                    <th className="text-center pb-2 px-2 font-medium">{t("dashboard.students")}</th>
                    <th className="text-center pb-2 px-2 font-medium">{t("dashboard.present")}</th>
                    <th className="text-center pb-2 px-2 font-medium">{t("dashboard.absent")}</th>
                    <th className="text-right pb-2 pl-2 font-medium">{t("dashboard.rate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...s.section_attendance]
                    .sort((a, b) => a.attendance_rate - b.attendance_rate)
                    .map(row => (
                      <tr key={row.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="py-2 pr-3 font-medium text-slate-900">{row.name}</td>
                        <td className="py-2 px-2 text-center text-slate-600">{row.grade_level}</td>
                        <td className="py-2 px-2 text-center text-slate-600">{row.total_students}</td>
                        <td className="py-2 px-2 text-center text-green-600 font-medium">{row.present}</td>
                        <td className="py-2 px-2 text-center text-red-600 font-medium">{row.absent}</td>
                        <td className="py-2 pl-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${rateBarColor(row.attendance_rate)}`}
                                style={{ width: `${row.attendance_rate}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium w-10 text-right ${attendanceColor(row.attendance_rate)}`}>
                              {row.attendance_rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
