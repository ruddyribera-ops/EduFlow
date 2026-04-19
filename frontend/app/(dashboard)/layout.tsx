"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, clearSession } from "@/lib/auth";
import type { User } from "@/types";

const NAV = [
  { href: "/", label: "Dashboard", icon: "◉" },
  { href: "/admissions", label: "Admissions", icon: "▦" },
  { href: "/students", label: "Students", icon: "◊" },
  { href: "/sections", label: "Sections", icon: "▤" },
  { href: "/risk-alerts", label: "Risk Alerts", icon: "⚠" },
  { href: "/broadcast", label: "Broadcast", icon: "◈" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
    setReady(true);
  }, [router]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!ready) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 shrink-0 bg-slate-900 text-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="text-lg font-bold">EduFlow</div>
          <div className="text-xs text-slate-400">School CRM</div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
        <div className="p-3 border-t border-slate-700 text-xs">
          <div className="font-medium text-white">{user?.name}</div>
          <div className="text-slate-400 capitalize">{user?.role}</div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full text-left text-slate-400 hover:text-white"
          >
            Sign out →
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto">{children}</main>
    </div>
  );
}
