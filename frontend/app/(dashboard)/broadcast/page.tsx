"use client";

import useSWR from "swr";
import { useState } from "react";
import { apiFetch, swrFetcher, ApiError } from "@/lib/api";
import type { ApiListResponse, ApiResource, Student, BroadcastResult } from "@/types";

export default function BroadcastPage() {
  const { data: studentsRes } = useSWR<ApiListResponse<Student>>("/students", swrFetcher);
  const { data: historyRes, mutate: refreshHistory } = useSWR<ApiListResponse<BroadcastResult>>("/broadcasts", swrFetcher);

  const [message, setMessage] = useState("");
  const [scope, setScope] = useState<"all" | "students">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleStudent(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSend() {
    setError(null);
    setResult(null);
    setSending(true);
    try {
      const res = await apiFetch<ApiResource<BroadcastResult>>("/broadcasts", {
        method: "POST",
        body: JSON.stringify({
          message,
          scope,
          student_ids: scope === "students" ? selected : undefined,
        }),
      });
      setResult(res.data);
      setMessage("");
      setSelected([]);
      refreshHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const canSend = message.trim().length >= 3 && (scope === "all" || selected.length > 0) && !sending;

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Emergency Broadcast</h1>
        <p className="text-sm text-slate-500 mt-1">
          Notifies guardians via email/SMS based on each guardian's communication preference.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="e.g. School closure tomorrow due to weather."
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Target</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={scope === "all"} onChange={() => setScope("all")} />
              All guardians (school-wide)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={scope === "students"} onChange={() => setScope("students")} />
              Specific students
            </label>
          </div>
        </div>

        {scope === "students" && studentsRes && (
          <div className="border border-slate-200 rounded p-3 max-h-60 overflow-y-auto">
            <div className="text-xs font-medium text-slate-600 mb-2">
              Select students ({selected.length} selected)
            </div>
            {studentsRes.data.map((s) => (
              <label key={s.id} className="flex items-center gap-2 py-1 text-sm hover:bg-slate-50 px-2 rounded">
                <input
                  type="checkbox"
                  checked={selected.includes(s.id)}
                  onChange={() => toggleStudent(s.id)}
                />
                <span>{s.first_name} {s.last_name}</span>
                <span className="text-xs text-slate-500">· {s.grade_level}</span>
              </label>
            ))}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        {result && (
          <div className="text-sm bg-green-50 border border-green-200 rounded px-3 py-2 text-green-800">
            <div className="font-medium">Broadcast sent!</div>
            <div className="mt-1 text-xs">
              Recipients: {result.total} · Emails: {result.email_sent} · SMS: {result.sms_sent} · Skipped: {result.skipped}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            disabled={!canSend}
            onClick={handleSend}
            className="bg-slate-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send broadcast"}
          </button>
        </div>
      </div>

      {historyRes && historyRes.data.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Recent broadcasts</h2>
          <div className="space-y-2">
            {historyRes.data.slice(0, 5).map((b) => (
              <div key={b.id} className="border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm text-slate-900 flex-1">{b.message}</div>
                  <div className="text-xs text-slate-500 shrink-0">
                    {new Date(b.sent_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {b.scope === "all" ? "All guardians" : `${b.student_ids?.length ?? 0} students`} · {b.total} recipients · {b.email_sent} emails · {b.sms_sent} SMS
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
