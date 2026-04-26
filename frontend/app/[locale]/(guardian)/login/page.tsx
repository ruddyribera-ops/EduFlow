"use client";

import { useState } from "react";
import { useRouter, useLocale } from "next/navigation";
import { useTranslations } from "next-intl";
import { useGuardianAuth } from "@/hooks/useGuardianAuth";

export default function GuardianLoginPage() {
  const t = useTranslations("guardian");
  const tApp = useTranslations("app");
  const locale = useLocale();
  const router = useRouter();
  const { login } = useGuardianAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push(`/${locale}/guardian/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loginError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-8">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-slate-900">{tApp("title")}</div>
          <div className="text-sm text-slate-500 mt-1">{t("subtitle")}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t("email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              placeholder="guardian@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t("password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t("signingIn") : t("signIn")}
          </button>
        </form>
      </div>
    </div>
  );
}
