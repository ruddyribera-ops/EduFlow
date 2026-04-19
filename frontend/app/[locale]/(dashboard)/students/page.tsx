"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { swrFetcher } from "@/lib/api";
import type { ApiListResponse, Student, EnrollmentStatus } from "@/types";

const STATUS_BADGE: Record<EnrollmentStatus, string> = {
  inquiry: "bg-slate-100 text-slate-700",
  applied: "bg-blue-100 text-blue-700",
  accepted: "bg-indigo-100 text-indigo-700",
  enrolled: "bg-green-100 text-green-700",
  withdrawn: "bg-amber-100 text-amber-700",
  graduated: "bg-purple-100 text-purple-700",
};

export default function StudentsPage() {
  const locale = useLocale();
  const t = useTranslations();
  const [grade, setGrade] = useState("");
  const [status, setStatus] = useState("");
  const query = new URLSearchParams();
  if (grade) query.set("grade_level", grade);
  if (status) query.set("enrollment_status", status);
  const qs = query.toString();

  const { data, error, isLoading } = useSWR<ApiListResponse<Student>>(
    `/students${qs ? `?${qs}` : ""}`,
    swrFetcher
  );

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("students.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{data?.meta.total ?? 0} {t("students.total")}</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-lg p-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("students.filters.gradeLevel")}</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">{t("students.filters.allGrades")}</option>
            <option value="2nd">2nd</option>
            <option value="3rd">3rd</option>
            <option value="4th">4th</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("students.filters.enrollmentStatus")}</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">{t("students.filters.allStatuses")}</option>
            {Object.keys(STATUS_BADGE).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {(grade || status) && (
          <button
            onClick={() => { setGrade(""); setStatus(""); }}
            className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1.5"
          >
            {t("students.filters.clearFilters")}
          </button>
        )}
      </div>

      {isLoading && <div className="text-slate-500">{t("common.loading")}</div>}
      {error && <div className="text-red-600">{t("common.error")}: {error.message}</div>}

      {data && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium text-slate-600">{t("students.table.name")}</th>
                <th className="px-4 py-2 font-medium text-slate-600">{t("students.table.grade")}</th>
                <th className="px-4 py-2 font-medium text-slate-600">{t("students.table.status")}</th>
                <th className="px-4 py-2 font-medium text-slate-600">{t("students.table.section")}</th>
                <th className="px-4 py-2 font-medium text-slate-600">{t("students.table.guardians")}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{s.first_name} {s.last_name}</td>
                  <td className="px-4 py-2.5 text-slate-700">{s.grade_level}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[s.enrollment_status]}`}>
                      {s.enrollment_status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{s.section?.name ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-2.5 text-slate-700">{s.guardians?.length ?? 0}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/${locale}/students/${s.id}`} className="text-sm text-slate-600 hover:text-slate-900">
                      {t("students.table.view")}
                    </Link>
                  </td>
                </tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">{t("students.table.noResults")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
