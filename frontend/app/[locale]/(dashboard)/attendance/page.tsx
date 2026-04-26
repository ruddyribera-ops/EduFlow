"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSections } from "@/hooks/useSections";
import { useAttendance, type AttendanceStatus } from "@/hooks/useAttendance";
import type { Section } from "@/types";
import type { User } from "@/types";

const STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "tardy", label: "Tardy" },
  { value: "excused", label: "Excused" },
];

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  tardy: "bg-amber-100 text-amber-700",
  excused: "bg-slate-100 text-slate-600",
};

interface LocalRecord {
  id: string | null;
  student_id: string;
  student_name: string;
  grade_level: string | null;
  status: AttendanceStatus;
  notes: string;
  isDirty: boolean;
}

export default function AttendancePage() {
  const t = useTranslations("attendance");
  const tCommon = useTranslations("common");
  const { sections } = useSections();
  const [user] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("auth_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Filter sections based on user role
  const visibleSections = useMemo(() => {
    if (!user) return [];
    if (["admin", "director", "coordinator", "receptionist"].includes(user.role)) {
      return sections;
    }
    // Teacher: only assigned sections
    const assigned = user.assigned_sections ?? [];
    return sections.filter((s: Section) => assigned.includes(s.id));
  }, [sections, user]);

  const { records, isLoading, batch } = useAttendance(
    selectedSection || null,
    selectedDate
  );

  const [localRecords, setLocalRecords] = useState<LocalRecord[]>([]);
  const [initialized, setInitialized] = useState(false);

  // When records come in from API, seed local state
  if (!initialized && records.length > 0) {
    setLocalRecords(
      records.map((r) => ({
        id: r.id,
        student_id: r.student_id,
        student_name: r.student_name ?? "Unknown",
        grade_level: r.grade_level,
        status: r.status,
        notes: r.notes ?? "",
        isDirty: false,
      }))
    );
    setInitialized(true);
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    setLocalRecords((prev) =>
      prev.map((r) =>
        r.student_id === studentId ? { ...r, status, isDirty: true } : r
      )
    );
  }

  function setNotes(studentId: string, notes: string) {
    setLocalRecords((prev) =>
      prev.map((r) =>
        r.student_id === studentId ? { ...r, notes, isDirty: true } : r
      )
    );
  }

  function markAllPresent() {
    setLocalRecords((prev) =>
      prev.map((r) => ({ ...r, status: "present", isDirty: true }))
    );
  }

  async function handleSubmit() {
    if (!selectedSection) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      const payload = {
        section_id: selectedSection,
        date: selectedDate,
        records: localRecords.map((r) => ({
          student_id: r.student_id,
          status: r.status,
          notes: r.notes || undefined,
        })),
      };
      const result = await batch(payload);
      setSubmitSuccess(
        `${result.meta.present}/${result.meta.total} present, ${result.meta.tardy} tardy, ${result.meta.absent} absent, ${result.meta.excused} excused`
      );
      setLocalRecords((prev) =>
        prev.map((r) => ({ ...r, isDirty: false }))
      );
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save attendance");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end bg-white border border-slate-200 rounded-lg p-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("date")}</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setInitialized(false);
              setLocalRecords([]);
            }}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("section")}</label>
          <select
            value={selectedSection}
            onChange={(e) => {
              setSelectedSection(e.target.value);
              setInitialized(false);
              setLocalRecords([]);
            }}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm min-w-[200px]"
          >
            <option value="">-- {t("selectSection")} --</option>
            {visibleSections.map((s: Section) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.grade_level})
              </option>
            ))}
          </select>
        </div>
        {selectedSection && localRecords.length > 0 && (
          <button
            onClick={markAllPresent}
            className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
          >
            {t("markAllPresent")}
          </button>
        )}
      </div>

      {/* Error / success */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">
          {submitError}
        </div>
      )}
      {submitSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded">
          ✓ {submitSuccess}
        </div>
      )}

      {/* Roster */}
      {isLoading && (
        <div className="text-slate-500">{tCommon("loading")}</div>
      )}

      {!selectedSection && (
        <div className="text-slate-400 text-sm">{t("selectSectionPrompt")}</div>
      )}

      {selectedSection && !isLoading && localRecords.length === 0 && initialized && (
        <div className="text-slate-500">{t("noStudents")}</div>
      )}

      {localRecords.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("student")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("grade")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("status")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("notes")}</th>
              </tr>
            </thead>
            <tbody>
              {localRecords.map((record) => (
                <tr key={record.student_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{record.student_name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{record.grade_level ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={record.status}
                      onChange={(e) => setStatus(record.student_id, e.target.value as AttendanceStatus)}
                      className={`text-xs font-medium border rounded px-2 py-1 ${STATUS_COLORS[record.status]}`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      value={record.notes}
                      onChange={(e) => setNotes(record.student_id, e.target.value)}
                      placeholder={t("notesPlaceholder")}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || localRecords.filter((r) => r.isDirty).length === 0}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? tCommon("loading") : t("save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}