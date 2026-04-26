"use client";

import { useRouter, useLocale } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useGuardianAuth } from "@/hooks/useGuardianAuth";

export default function GuardianDashboardPage() {
  const t = useTranslations("guardian");
  const locale = useLocale();
  const { guardian, isAuthenticated, loading } = useGuardianAuth();
  const router = useRouter();

  if (!loading && !isAuthenticated) {
    router.push(`/${locale}/guardian/login`);
    return null;
  }

  if (!guardian) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t("welcome")}, {guardian.first_name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{t("portalSubtitle")}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">{t("myChildren")}</h2>
        {guardian.students.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-8 text-center text-slate-500">
            {t("noChildren")}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {guardian.students.map((child) => (
              <div
                key={child.id}
                className="bg-white border border-slate-200 rounded-lg p-5"
              >
                <div className="text-base font-semibold text-slate-900">
                  {child.first_name} {child.last_name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {t("grade")}: {child.grade_level}
                </div>
                <div className="mt-4 space-y-2">
                  <Link
                    href={`/${locale}/guardian/children/${child.id}/incidents`}
                    className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded text-sm text-slate-700"
                  >
                    <span>{t("viewIncidents")}</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href={`/${locale}/guardian/children/${child.id}/attendance`}
                    className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded text-sm text-slate-700"
                  >
                    <span>{t("viewAttendance")}</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href={`/${locale}/guardian/children/${child.id}/grades`}
                    className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded text-sm text-slate-700"
                  >
                    <span>{t("viewGrades")}</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
