"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useParentMeetings, type CreateMeetingPayload } from "@/hooks/useParentMeetings";
import { useSections } from "@/hooks/useSections";
import type { Section } from "@/types";

const MODALITY_COLORS: Record<string, string> = {
  in_person: "bg-blue-100 text-blue-700",
  virtual: "bg-purple-100 text-purple-700",
  phone: "bg-teal-100 text-teal-700",
};

const CONFIRMATION_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const MODALITY_OPTIONS = [
  { value: "in_person", label: "In Person" },
  { value: "virtual", label: "Virtual" },
  { value: "phone", label: "Phone" },
];

const CONFIRMATION_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
];

interface MeetingForm {
  student_id: string;
  meeting_date: string;
  tutor_name: string;
  day_time: string;
  attendees: string;
  modality: string;
  confirmation: string;
  observation: string;
}

const emptyForm: MeetingForm = {
  student_id: "",
  meeting_date: "",
  tutor_name: "",
  day_time: "",
  attendees: "",
  modality: "",
  confirmation: "",
  observation: "",
};

export default function ParentMeetingsPage() {
  const t = useTranslations("parentMeetings");
  const tCommon = useTranslations("common");

  const [studentFilter, setStudentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modalityFilter, setModalityFilter] = useState("");
  const [confirmationFilter, setConfirmationFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MeetingForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { meetings, isLoading, create, update, remove } = useParentMeetings({
    student_id: studentFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const { sections } = useSections();

  const enrolledStudents = useMemo(() => {
    const studentMap = new Map<string, { id: string; name: string; grade_level: string }>();
    sections.forEach((s: Section) => {
      s.students?.forEach((st: any) => {
        if (!studentMap.has(st.id)) {
          studentMap.set(st.id, {
            id: st.id,
            name: `${st.first_name} ${st.last_name}`,
            grade_level: st.grade_level,
          });
        }
      });
    });
    return Array.from(studentMap.values());
  }, [sections]);

  const filtered = useMemo(() => {
    let result = meetings;
    if (modalityFilter) {
      result = result.filter((m) => m.modality === modalityFilter);
    }
    if (confirmationFilter) {
      result = result.filter((m) => m.confirmation === confirmationFilter);
    }
    return result;
  }, [meetings, modalityFilter, confirmationFilter]);

  function setField<K extends keyof MeetingForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  }

  function openEdit(meeting: any) {
    setEditingId(meeting.id);
    setForm({
      student_id: meeting.student_id ?? "",
      meeting_date: meeting.meeting_date ? meeting.meeting_date.split("T")[0] : "",
      tutor_name: meeting.tutor_name ?? "",
      day_time: meeting.day_time ?? "",
      attendees: meeting.attendees ?? "",
      modality: meeting.modality ?? "",
      confirmation: meeting.confirmation ?? "",
      observation: meeting.observation ?? "",
    });
    setFormError(null);
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!form.student_id || !form.meeting_date) {
      setFormError(t("fillAllFields"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        student_id: form.student_id,
        meeting_date: form.meeting_date,
        tutor_name: form.tutor_name || undefined,
        day_time: form.day_time || undefined,
        attendees: form.attendees || undefined,
        modality: form.modality || undefined,
        confirmation: form.confirmation || undefined,
        observation: form.observation || undefined,
      };
      if (editingId) {
        await update(editingId, payload as CreateMeetingPayload);
      } else {
        await create(payload as CreateMeetingPayload);
      }
      setShowModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error saving meeting");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await remove(deleteId);
      setDeleteId(null);
    } catch (err) {
      // handle error — leave modal open
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} meetings</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          {t("scheduleMeeting")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("student")}</label>
          <input
            type="text"
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            placeholder={t("studentPlaceholder")}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("dateFrom")}</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("dateTo")}</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("modality")}</label>
          <select
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            {MODALITY_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("confirmation")}</label>
          <select
            value={confirmationFilter}
            onChange={(e) => setConfirmationFilter(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            {CONFIRMATION_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        {(studentFilter || dateFrom || dateTo || modalityFilter || confirmationFilter) && (
          <button
            onClick={() => {
              setStudentFilter("");
              setDateFrom("");
              setDateTo("");
              setModalityFilter("");
              setConfirmationFilter("");
            }}
            className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1.5"
          >
            {t("clearFilters")}
          </button>
        )}
      </div>

      {/* Loading / empty */}
      {isLoading && <div className="text-slate-500">{tCommon("loading")}</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-8 text-center text-slate-500">
          {t("noMeetings")}
        </div>
      )}

      {/* Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("date")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("student")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("tutorName")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("dayTime")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("attendees")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("modality")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("confirmation")}</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((meeting) => (
                <tr
                  key={meeting.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-2.5 text-slate-700">
                    {formatDate(meeting.meeting_date)}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {meeting.student_name ?? meeting.student_id}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{meeting.tutor_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{meeting.day_time ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{meeting.attendees ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {meeting.modality ? (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${MODALITY_COLORS[meeting.modality] ?? "bg-slate-100 text-slate-600"}`}>
                        {meeting.modality.replace("_", " ")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {meeting.confirmation ? (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${CONFIRMATION_COLORS[meeting.confirmation] ?? "bg-slate-100 text-slate-600"}`}>
                        {meeting.confirmation}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => openEdit(meeting)}
                      className="text-xs text-blue-600 hover:text-blue-800 mr-3"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => setDeleteId(meeting.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? t("editMeeting") : t("scheduleMeeting")}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {formError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("student")} *</label>
                <select
                  value={form.student_id}
                  onChange={(e) => setField("student_id", e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">— {t("selectStudent")} —</option>
                  {enrolledStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.grade_level})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("date")} *</label>
                <input
                  type="date"
                  value={form.meeting_date}
                  onChange={(e) => setField("meeting_date", e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("tutorName")}</label>
                <input
                  type="text"
                  value={form.tutor_name}
                  onChange={(e) => setField("tutor_name", e.target.value)}
                  placeholder="e.g. Ms. Johnson"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("dayTime")}</label>
                <input
                  type="text"
                  value={form.day_time}
                  onChange={(e) => setField("day_time", e.target.value)}
                  placeholder="e.g. Monday 3pm"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("attendees")}</label>
                <input
                  type="text"
                  value={form.attendees}
                  onChange={(e) => setField("attendees", e.target.value)}
                  placeholder="e.g. Mother, Father, Grandmother"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("modality")}</label>
                  <select
                    value={form.modality}
                    onChange={(e) => setField("modality", e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {MODALITY_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("confirmation")}</label>
                  <select
                    value={form.confirmation}
                    onChange={(e) => setField("confirmation", e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {CONFIRMATION_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("observation")}</label>
                <textarea
                  value={form.observation}
                  onChange={(e) => setField("observation", e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  placeholder={t("observationPlaceholder")}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? tCommon("loading") : (editingId ? t("save") : t("scheduleMeeting"))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">{t("deleteMeeting")}</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-slate-600">{t("deleteConfirm")}</p>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? tCommon("loading") : t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
