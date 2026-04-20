"use client";

import useSWR, { mutate } from "swr";
import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch, swrFetcher, ApiError } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import type { ApiListResponse, ApiResource, RiskAlert, RiskFactor, RiskStatus, Student } from "@/types";

const FACTOR_LABEL: Record<RiskFactor, string> = {
  low_attendance: "riskAlerts.attendance",
  grade_decline: "riskAlerts.gradeDrop",
};

const STATUS_BADGE: Record<RiskStatus, string> = {
  pending: "bg-red-100 text-red-700",
  reviewed: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
};

export default function RiskAlertsPage() {
  const locale = useLocale();
  const t = useTranslations();
  const [filter, setFilter] = useState<"" | RiskStatus>("");
  const key = `/risk-alerts${filter ? `?status=${filter}` : ""}`;
  const { data, error, isLoading } = useSWR<ApiListResponse<RiskAlert>>(key, swrFetcher);
  const [updating, setUpdating] = useState<string | null>(null);

  // Raise alert modal
  const [raiseModal, setRaiseModal] = useState(false);
  const [studentsData, setStudentsData] = useState<Student[]>([]);
  const [raiseForm, setRaiseForm] = useState({
    student_id: "",
    attendance_rate: "",
    grade_drop_percentage: "",
    risk_factors: [] as RiskFactor[],
    notes: "",
  });
  const [raiseError, setRaiseError] = useState<string | null>(null);
  const [raising, setRaising] = useState(false);

  // Inline notes editing
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState<string | null>(null);

  // Fetch student list for raise alert modal
  async function openRaiseModal() {
    setRaiseError(null);
    setRaiseForm({ student_id: "", attendance_rate: "", grade_drop_percentage: "", risk_factors: [], notes: "" });
    try {
      const res = await apiFetch<ApiListResponse<Student>>("/students");
      setStudentsData(res.data);
      setRaiseModal(true);
    } catch {
      setRaiseError(t("common.error"));
    }
  }

  async function handleRaiseAlert() {
    if (!raiseForm.student_id || !raiseForm.attendance_rate || !raiseForm.grade_drop_percentage || raiseForm.risk_factors.length === 0) {
      setRaiseError(t("riskAlerts.fillAllFields"));
      return;
    }
    setRaising(true);
    setRaiseError(null);
    try {
      await apiFetch<ApiResource<RiskAlert>>("/risk-alerts", {
        method: "POST",
        body: JSON.stringify({
          student_id: raiseForm.student_id,
          attendance_rate: parseFloat(raiseForm.attendance_rate) / 100,
          grade_drop_percentage: parseFloat(raiseForm.grade_drop_percentage) / 100,
          risk_factors: raiseForm.risk_factors,
          notes: raiseForm.notes || undefined,
        }),
      });
      mutate(key);
      setRaiseModal(false);
    } catch (err) {
      setRaiseError(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setRaising(false);
    }
  }

  async function updateStatus(id: string, status: RiskStatus) {
    setUpdating(id);
    try {
      await apiFetch<ApiResource<RiskAlert>>(`/risk-alerts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      mutate(key);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setUpdating(null);
    }
  }

  function startEditNotes(alert: RiskAlert) {
    setEditingNotes(alert.id);
    setNotesValue(alert.notes ?? "");
  }

  async function saveNotes(id: string) {
    setSavingNotes(id);
    try {
      await apiFetch<ApiResource<RiskAlert>>(`/risk-alerts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: notesValue }),
      });
      mutate(key);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setSavingNotes(null);
      setEditingNotes(null);
    }
  }

  function toggleFactor(f: RiskFactor) {
    setRaiseForm((prev) => ({
      ...prev,
      risk_factors: prev.risk_factors.includes(f)
        ? prev.risk_factors.filter((x) => x !== f)
        : [...prev.risk_factors, f],
    }));
  }

  const studentOptions = studentsData.map((s) => ({
    value: s.id,
    label: `${s.first_name} ${s.last_name} (${s.grade_level})`,
  }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("riskAlerts.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("riskAlerts.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "" | RiskStatus)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">{t("riskAlerts.allStatuses")}</option>
            <option value="pending">{t("riskAlerts.pending")}</option>
            <option value="reviewed">{t("riskAlerts.reviewed")}</option>
            <option value="resolved">{t("riskAlerts.resolved")}</option>
          </select>
          <Button onClick={openRaiseModal}>{t("riskAlerts.raiseAlert")}</Button>
        </div>
      </div>

      {isLoading && <div className="text-slate-500">{t("common.loading")}</div>}
      {error && <div className="text-red-600">{t("common.error")}: {error.message}</div>}

      {data && (
        <div className="space-y-3">
          {data.data.map((alert) => (
            <div key={alert.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[alert.status]}`}>
                      {t(`riskAlerts.${alert.status}`)}
                    </span>
                    {alert.student && (
                      <Link href={`/${locale}/students/${alert.student.id}`} className="font-semibold text-slate-900 hover:underline">
                        {alert.student.first_name} {alert.student.last_name}
                      </Link>
                    )}
                    {alert.student && <span className="text-sm text-slate-500">· {alert.student.grade_level}</span>}
                  </div>

                  <div className="mt-2 flex gap-2 flex-wrap">
                    {alert.risk_factors.map((f) => (
                      <span key={f} className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded">
                        {t(FACTOR_LABEL[f])}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 text-sm text-slate-600 space-x-4">
                    <span>{t("riskAlerts.attendance")}: <strong>{(alert.attendance_rate * 100).toFixed(0)}%</strong></span>
                    {alert.grade_drop_percentage > 0 && (
                      <span>{t("riskAlerts.gradeDrop")}: <strong>-{(alert.grade_drop_percentage * 100).toFixed(0)}%</strong></span>
                    )}
                  </div>

                  {/* Inline notes */}
                  <div className="mt-2">
                    {editingNotes === alert.id ? (
                      <div className="flex gap-2">
                        <textarea
                          className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm"
                          rows={2}
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder={t("riskAlerts.notesPlaceholder")}
                          autoFocus
                        />
                        <div className="flex flex-col gap-1">
                          <button
                            disabled={savingNotes === alert.id}
                            onClick={() => saveNotes(alert.id)}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {savingNotes === alert.id ? t("common.loading") : t("common.save")}
                          </button>
                          <button
                            onClick={() => setEditingNotes(null)}
                            className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                          >
                            {t("common.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="text-sm text-slate-700 bg-slate-50 rounded p-2 cursor-pointer hover:bg-slate-100"
                        onClick={() => startEditNotes(alert)}
                        title={t("riskAlerts.clickToEditNotes")}
                      >
                        {alert.notes || <span className="text-slate-400 italic">{t("riskAlerts.noNotes")}</span>}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-slate-400">
                    {t("riskAlerts.detected")} {new Date(alert.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  {alert.status === "pending" && (
                    <button
                      disabled={updating === alert.id}
                      onClick={() => updateStatus(alert.id, "reviewed")}
                      className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {t("riskAlerts.markReviewed")}
                    </button>
                  )}
                  {alert.status !== "resolved" && (
                    <button
                      disabled={updating === alert.id}
                      onClick={() => updateStatus(alert.id, "resolved")}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {t("riskAlerts.resolve")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {data.data.length === 0 && (
            <div className="text-center text-slate-500 py-8">{t("riskAlerts.noAlerts")}</div>
          )}
        </div>
      )}

      {/* Raise Alert Modal */}
      <Modal
        open={raiseModal}
        onClose={() => setRaiseModal(false)}
        title={t("riskAlerts.raiseAlert")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRaiseModal(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleRaiseAlert} loading={raising}>{t("riskAlerts.raise")}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {raiseError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{raiseError}</div>}
          <FormField label={t("riskAlerts.student")}>
            <Select
              value={raiseForm.student_id}
              onChange={(e) => setRaiseForm((f) => ({ ...f, student_id: e.target.value }))}
              options={[{ value: "", label: t("riskAlerts.selectStudent") }, ...studentOptions]}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("riskAlerts.attendanceRate")}>
              <Input
                type="number"
                min="0"
                max="100"
                value={raiseForm.attendance_rate}
                onChange={(e) => setRaiseForm((f) => ({ ...f, attendance_rate: e.target.value }))}
                placeholder="e.g. 75"
              />
            </FormField>
            <FormField label={t("riskAlerts.gradeDropRate")}>
              <Input
                type="number"
                min="0"
                max="100"
                value={raiseForm.grade_drop_percentage}
                onChange={(e) => setRaiseForm((f) => ({ ...f, grade_drop_percentage: e.target.value }))}
                placeholder="e.g. 20"
              />
            </FormField>
          </div>
          <FormField label={t("riskAlerts.riskFactors")}>
            <div className="flex gap-3 mt-1">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={raiseForm.risk_factors.includes("low_attendance")}
                  onChange={() => toggleFactor("low_attendance")}
                />
                {t("riskAlerts.lowAttendance")}
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={raiseForm.risk_factors.includes("grade_decline")}
                  onChange={() => toggleFactor("grade_decline")}
                />
                {t("riskAlerts.gradeDecline")}
              </label>
            </div>
          </FormField>
          <FormField label={t("riskAlerts.notes")}>
            <textarea
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              rows={3}
              value={raiseForm.notes}
              onChange={(e) => setRaiseForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={t("riskAlerts.notesPlaceholder")}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}