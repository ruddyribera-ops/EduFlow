"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import type { GradeRecord } from "@/hooks/useGrades";

interface GradesResponse {
  data: GradeRecord[];
}

const TYPE_LABELS: Record<string, string> = {
  exam: "Exam",
  homework: "Homework",
  project: "Project",
  quiz: "Quiz",
  participation: "Participation",
};

export default function GuardianChildGradesPage() {
  const t = useTranslations("guardian");
  const pathname = usePathname();
  const childId = pathname.split("/").filter(Boolean).pop() ?? "";

  const { data, isLoading } = useSWR<GradesResponse>(
    `/guardian/children/${childId}/grades`,
    swrFetcher
  );

  const grades = data?.data ?? [];

  const average = grades.length
    ? Math.round((grades.reduce((s, g) => s + (g.percentage ?? 0), 0) / grades.length) * 10) / 10
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">{t("grades")}</h1>

      {average !== null && (
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-slate-600">{t("overallAverage")}</span>
          <span className="text-lg font-bold text-slate-900">{average}%</span>
        </div>
      )}

      {isLoading && <div className="text-slate-500">{t("loading")}</div>}

      {!isLoading && grades.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-8 text-center text-slate-500">
          {t("noGrades")}
        </div>
      )}

      {!isLoading && grades.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("date")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("subject")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("type")}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">{t("score")}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">{t("percentage")}</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((grade) => (
                <tr key={grade.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-600 text-xs">
                    {grade.date ? new Date(grade.date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 font-medium">
                    {grade.section_name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {TYPE_LABELS[grade.type] ?? grade.type}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700">
                    {grade.score}/{grade.max_score}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {grade.percentage !== null ? (
                      <span className={`font-medium ${grade.percentage < 60 ? "text-red-600" : "text-green-700"}`}>
                        {grade.percentage}%
                      </span>
                    ) : (
                      "—"
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
