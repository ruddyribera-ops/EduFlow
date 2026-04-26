"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getUser, clearSession } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { User } from "@/types";
import { getNavItemsForRole, roleLabel, isHighPrivilege } from "@/lib/permissions";
import type { NavItem } from "@/lib/permissions";

const NAV_GROUPS = [
  { key: "home", label: "HOME", roles: ["admin", "director", "coordinator", "receptionist", "teacher", "counselor", "guardian"] },
  { key: "daily", label: "DAILY OPERATIONS", roles: ["admin", "director", "coordinator", "receptionist", "teacher", "counselor"] },
  { key: "academics", label: "ACADEMICS", roles: ["admin", "director", "coordinator", "teacher"] },
  { key: "people", label: "PEOPLE", roles: ["admin", "director", "coordinator", "receptionist", "teacher", "counselor"] },
  { key: "enrollment", label: "ENROLLMENT", roles: ["admin", "director", "coordinator", "receptionist"] },
  { key: "communication", label: "COMMUNICATION", roles: ["admin", "director", "receptionist"] },
  { key: "school", label: "SCHOOL", roles: ["admin", "director", "coordinator", "receptionist", "teacher", "counselor"] },
  { key: "admin", label: "ADMIN", roles: ["admin", "director"] },
];

function matchesPath(pathname: string, href: string): boolean {
  if (href === `/${useLocale()}`) return pathname === `/${useLocale()}`;
  return pathname.startsWith(href);
}

function navLabel(key: string): string {
  const map: Record<string, string> = {
    "": "",
    dashboard: "Dashboard",
    attendance: "Attendance",
    incidents: "Incidents",
    reception: "Reception Desk",
    "my-classes": "My Classes",
    gradebook: "Gradebook",
    sections: "Sections",
    subjects: "Subjects",
    students: "Students",
    guardians: "Guardians",
    staff: "Staff",
    admissions: "Admissions",
    "risk-alerts": "Risk Alerts",
    broadcast: "Broadcast",
    messages: "Messages",
    calendar: "Calendar",
    schedule: "Schedule",
    users: "Users",
    reports: "Reports",
    settings: "Settings",
  };
  return map[key] ?? key;
}

function navIcon(key: string): string {
  const map: Record<string, string> = {
    "": "",
    dashboard: "◉",
    attendance: "✓",
    incidents: "⚠",
    reception: "☎",
    "my-classes": "▦",
    gradebook: "◊",
    sections: "▤",
    subjects: "◇",
    students: "👤",
    guardians: "👥",
    staff: "🎓",
    admissions: "▦",
    "risk-alerts": "⚠",
    broadcast: "◈",
    messages: "✉",
    calendar: "📅",
    schedule: "⏰",
    users: "⚙",
    reports: "📊",
    settings: "🔧",
  };
  return map[key] ?? "○";
}

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

  if (!ready) {
    return <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  const userRole = user?.role ?? "guardian";
  const navItems = getNavItemsForRole(userRole);

  // Build href map for matching
  const navHrefMap: Record<string, NavItem> = {};
  navItems.forEach((item) => {
    navHrefMap[item.href] = item;
  });

  // Group nav items by their group category
  const dashboardItems = navItems.filter((i) => i.href === `/${locale}`);
  const dailyItems = navItems.filter((i) =>
    ["/attendance", "/incidents", "/reception"].some((p) => i.href.endsWith(p))
  );
  const academicsItems = navItems.filter((i) =>
    ["/my-classes", "/gradebook", "/sections", "/subjects"].some((p) => i.href.endsWith(p))
  );
  const peopleItems = navItems.filter((i) =>
    ["/students", "/guardians", "/staff"].some((p) => i.href.endsWith(p))
  );
  const enrollmentItems = navItems.filter((i) =>
    ["/admissions", "/risk-alerts"].some((p) => i.href.endsWith(p))
  );
  const commItems = navItems.filter((i) =>
    ["/broadcast", "/messages"].some((p) => i.href.endsWith(p))
  );
  const schoolItems = navItems.filter((i) =>
    ["/calendar", "/schedule"].some((p) => i.href.endsWith(p))
  );
  const adminItems = navItems.filter((i) =>
    ["/users", "/reports", "/settings"].some((p) => i.href.endsWith(p))
  );

  const groups = [
    { label: "HOME", items: dashboardItems },
    { label: "DAILY OPERATIONS", items: dailyItems },
    { label: "ACADEMICS", items: academicsItems },
    { label: "PEOPLE", items: peopleItems },
    { label: "ENROLLMENT", items: enrollmentItems },
    { label: "COMMUNICATION", items: commItems },
    { label: "SCHOOL", items: schoolItems },
    { label: "ADMIN", items: adminItems },
  ].filter((g) => g.items.length > 0);

  function isActive(href: string): boolean {
    if (href === `/${locale}`) return pathname === `/${locale}`;
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="text-lg font-bold tracking-wide">{t("app.title")}</div>
          <div className="text-xs text-slate-400 mt-0.5">{t("app.subtitle")}</div>
          {user && (
            <div className={`mt-2 text-xs px-2 py-0.5 rounded inline-block ${
              isHighPrivilege(userRole) ? "bg-blue-900 text-blue-200" : "bg-slate-700 text-slate-300"
            }`}>
              {roleLabel(userRole)}
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 tracking-widest uppercase">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                      isActive(item.href)
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span className="text-base w-5 text-center">{navIcon(item.label.toLowerCase().replace(/ /g, "-"))}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700 space-y-3">
          <LanguageSwitcher />
          <div>
            <div className="text-xs font-medium text-white">
              <Link href={`/${locale}/profile`} className="hover:text-slate-200">
                {user?.name}
              </Link>
            </div>
            <div className="text-xs text-slate-400 capitalize">{user?.email}</div>
            <button
              onClick={handleLogout}
              className="mt-1 text-xs text-slate-400 hover:text-white"
            >
              {t("nav.signOut")}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto">
        {children}
      </main>
    </div>
  );
}