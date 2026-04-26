"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useGuardianAuth } from "@/hooks/useGuardianAuth";

export default function GuardianLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const { guardian, isAuthenticated, loading, logout } = useGuardianAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated && pathname !== `/${locale}/guardian/login`) {
      router.replace(`/${locale}/guardian/login`);
    }
  }, [loading, isAuthenticated, pathname, locale, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Simple header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="text-lg font-bold text-slate-900">EduFlow Guardian Portal</div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            {guardian?.first_name} {guardian?.last_name}
          </span>
          <button
            onClick={logout}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            {t("nav.signOut")}
          </button>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
