"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getUser, clearSession } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { User } from "@/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();

  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace(`/${locale}/login`);
      return;
    }
    setUser(u);
    setReady(true);
  }, [locale, router]);

  function handleLogout() {
    clearSession();
    router.replace(`/${locale}/login`);
  }

  const NAV = [
    { href: `/${locale}`, label: t("nav.dashboard"), icon: "◉", match: (p: string) => p === `/${locale}` },
    { href: `/${locale}/admissions`, label: t("nav.admissions"), icon: "▦", match: (p: string) => p.includes("/admissions") },
    { href: `/${locale}/students`, label: t("nav.students"), icon: "◊", match: (p: string) => p.includes("/students") },
    { href: `/${locale}/sections`, label: t("nav.sections"), icon: "▤", match: (p: string) => p.includes("/sections") },
    { href: `/${locale}/risk-alerts`, label: t("nav.riskAlerts"), icon: "⚠", match: (p: string) => p.includes("/risk-alerts") },
    { href: `/${locale}/broadcast`, label: t("nav.broadcast"), icon: "◈", match: (p: string) => p.includes("/broadcast") },
    ...(user?.role === "admin"
      ? [{ href: `/${locale}/users`, label: t("nav.users"), icon: "▣", match: (p: string) => p.includes("/users") }]
      : []),
  ];

  if (!ready) {
    return <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 shrink-0 bg-slate-900 text-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="text-lg font-bold">{t("app.title")}</div>
          <div className="text-xs text-slate-400">{t("app.subtitle")}</div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  active ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-700 space-y-3">
          <LanguageSwitcher />
          <div>
            <div className="text-xs font-medium text-white">
              <Link href={`/${locale}/profile`} className="hover:text-slate-200">
                {user?.name}
              </Link>
            </div>
            <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
            <button
              onClick={handleLogout}
              className="mt-2 text-xs text-slate-400 hover:text-white"
            >
              {t("nav.signOut")}
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto">{children}</main>
    </div>
  );
}
