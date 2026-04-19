"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { saveSession, getUser } from "@/lib/auth";
import type { User } from "@/types";
import { useEffect } from "react";

interface LoginResponse {
  token: string;
  user: User;
}

const TEST_EMAILS = [
  "admin@eduflow.test",
  "sarah@eduflow.test",
  "emily@eduflow.test",
  "tom@eduflow.test",
  "lisa@eduflow.test",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@eduflow.test");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getUser()) router.replace("/");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      saveSession(res.token, res.user);
      router.replace("/");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">EduFlow</h1>
          <p className="text-sm text-slate-500">Sign in to your school CRM</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white rounded py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500 mb-2">Demo accounts (click to use):</div>
          <div className="grid grid-cols-1 gap-1">
            {TEST_EMAILS.map((e) => (
              <button
                key={e}
                onClick={() => setEmail(e)}
                className="text-left text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-2 py-1 rounded"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
