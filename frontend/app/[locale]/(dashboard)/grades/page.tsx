"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useGrades, type GradeRecord, type GradeType } from "@/hooks/useGrades";
import { useSections } from "@/hooks/useSections";
import { useSubjects } from "@/hooks/useSubjects";
import { useStudents } from "@/hooks/useStudents";
import { apiFetch } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { canEnterGrades } from "@/lib/permissions";
import type { Section, Student } from "@/types";

const TYPE_COLORS: Record<GradeType, string> = {
  exam: "bg-blue-100 text-blue-700",
  homework: "bg-green-100 text-green-700",
  project: "bg-purple-100 text-purple-700",
  quiz: "bg-amber-100 text-amber-700",
  participation: "bg-slate-100 text-slate-600",
};

const TYPE_OPTIONS: Array<{ value: GradeType; label: string }> = [
  { value: "exam", label: "Exam" },
  { value: "homework", label: "Homework" },
  { value: "project", label: "Project" },
  { value: "quiz", label: "Quiz" },
  { value: "participation", label: "Participation" },
];

interface GradeForm {
  section_id: string;
  student_id: string;
  type: GradeType;
  score: string;
  max_score: string;
  date: string;
  notes: string;
}

const emptyForm: GradeForm = {
  section_id: "",
  student_id: "",
  type: "exam",
  score: "",
  max_score: "100",
  date: new Date().toISOString().split("T")[0],
  notes: "",
};

interface EditForm extends GradeForm {
  id: string;
}

export default function GradesPage() {
  const t = useTranslations("grades");
  const tCommon = useTranslations("common");

  const user = getUser();
  const userRole = user?.role ?? "teacher";
  const canEnter = canEnterGrades(userRole);

  const { sections } = useSections();
  const { subjects } = useSubjects();
  const { students } = useStudents();

  // Filters
  const [sectionFilter, setSectionFilter] = useState<string>("");
  const [studentFilter, setStudentFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<GradeType | "">("");

  // Grades data
  const { grades, isLoading, create, update, remove } = useGrades({
    section_id: sectionFilter || null,
    student_id: studentFilter || null,
    date_from: dateFrom || null,
    date_to: dateTo || null,
    type: typeFilter || null,
  });

  // Enter grades modal
  const [showEnterModal, setShowEnterModal] = useState(false);
  const [form, setForm] = useState<GradeForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<GradeRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Live percentage preview
  const livePercentage = useMemo(() => {
    const score = parseFloat(form.score);
    const max = parseFloat(form.max_score);
    if (isNaN(score) || isNaN(max) || max <= 0) return null;
    return ((score / max) * 100).toFixed(1);
  }, [form.score, form.max_score]);

  // Filter sections based on role
  const visibleSections = useMemo(() => {
    if (!user) return [];
    if (["admin", "director", "coordinator", "receptionist"].includes(user.role)) return sections;
    const assigned = user.assigned_sections ?? [];
    return sections.filter((s: Section) => assigned.includes(s.id));
  }, [sections, user]);

  // Students in selected section
  const sectionStudents = useMemo(() => {
    if (!form.section_id) return [];
    // Get students from the section's student list or from the general student list filtered by section
    return students.filter((s: Student) => s.section_id === form.section_id);
  }, [form.section_id, students]);

  function setField<K extends keyof GradeForm>(key: K, value: GradeForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleEnterGrade() {
    if (!form.section_id || !form.student_id || !form.score || !form.max_score) {
      setFormError(t("fillAllFields"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await create({
        section_id: form.section_id,
        student_id: form.student_id,
        type: form.type,
        score: parseFloat(form.score),
        max_score: parseFloat(form.max_score),
        date: form.date,
        notes: form.notes || undefined,
      });
      setShowEnterModal(false);
      setForm(emptyForm);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error saving grade");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(grade: GradeRecord) {
    setEditForm({
      id: grade.id,
      section_id: grade.section_id,
      student_id: grade.student_id,
      type: grade.type,
      score: String(grade.score),
      max_score: String(grade.max_score),
      date: grade.date,
      notes: grade.notes ?? "",
    });
  }

  async function handleEditSave() {
    if (!editForm) return;
    setEditing(true);
    setEditError(null);
    try {
      await update(editForm.id, {
        score: parseFloat(editForm.score),
        max_score: parseFloat(editForm.max_score),
        type: editForm.type,
        date: editForm.date,
        notes: editForm.notes || undefined,
      });
      setEditForm(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error updating grade");
    } finally {
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      // keep modal open on error
    } finally {
      setDeleting(false);
    }
  }

  // Student average
  const studentAverages = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    grades.forEach((g) => {
      if (g.percentage !== null) {
        const current = map.get(g.student_id) ?? { sum: 0, count: 0 };
        map.set(g.student_id, {
          sum: current.sum + g.percentage,
          count: current.count + 1,
        });
      }
    });
    const result = new Map<string, string>();
    map.forEach((v, k) => {
      result.set(k, (v.sum / v.count).toFixed(1));
    });
    return result;
  }, [grades]);

  function clearFilters() {
    setSectionFilter("");
    setStudentFilter("");
    setDateFrom("");
    setDateTo("");
    setTypeFilter("");
  }

  const hasFilters = sectionFilter || studentFilter || dateFrom || dateTo || typeFilter;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        {canEnter && (
          <button
            onClick={() => setShowEnterModal(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            {t("enterGrades")}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-lg p-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("section")}</label>
          <select
            value={sectionFilter}
            onChange={(e) => { setSectionFilter(e.target.value); setStudentFilter(""); }}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm min-w-[180px]"
          >
            <option value="">All sections</option>
            {visibleSections.map((s: Section) => (
              <option key={s.id} value={s.id}>{s.name} ({s.grade_level})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("student")}</label>
          <input
            type="text"
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            placeholder="Search student..."
            className="border border-slate-300 rounded px-3 py-1.5 text-sm min-w-[180px]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("type")}</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as GradeType)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1.5"
          >
            {t("clearFilters")}
          </button>
        )}
      </div>

      {/* Loading / empty */}
      {isLoading && <div className="text-slate-500">{tCommon("loading")}</div>}

      {!isLoading && grades.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-8 text-center text-slate-500">
          {t("noGrades")}
        </div>
      )}

      {/* Grades table */}
      {!isLoading && grades.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("student")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("section")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("type")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("score")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("date")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("teacher")}</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">{t("average")}</th>
                {(canEnter || userRole === "admin" || userRole === "director") && (
                  <th className="px-4 py-2.5"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {grades.map((grade) => (
                <tr key={grade.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{grade.student_name ?? "Unknown"}</td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs">{grade.section_name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[grade.type]}`}>
                      {grade.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-slate-900">{grade.score}</span>
                    <span className="text-slate-400"> / {grade.max_score}</span>
                    {grade.percentage !== null && (
                      <span className="ml-2 text-xs text-slate-500">({grade.percentage}%)</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs">{grade.date}</td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs">{grade.teacher_name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {studentAverages.get(grade.student_id) ? (
                      <span className="text-xs font-medium text-blue-600">
                        {studentAverages.get(grade.student_id)}%
                      </span>
                    ) : "—"}
                  </td>
                  {(canEnter || userRole === "admin" || userRole === "director") && (
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEnter && (
                          <button
                            onClick={() => openEdit(grade)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            {tCommon("edit")}
                          </button>
                        )}
                        {(userRole === "admin" || userRole === "director") && (
                          <button
                            onClick={() => setDeleteTarget(grade)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            {tCommon("delete")}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Enter Grades Modal */}
      {showEnterModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{t("enterGrades")}</h2>
              <button onClick={() => { setShowEnterModal(false); setForm(emptyForm); setFormError(null); }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {formError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("section")}</label>
                <select
                  value={form.section_id}
                  onChange={(e) => setField("section_id", e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">— {t("selectSection")} —</option>
                  {visibleSections.map((s: Section) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.grade_level})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("student")}</label>
                <select
                  value={form.student_id}
                  onChange={(e) => setField("student_id", e.target.value)}
                  disabled={!form.section_id}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">— {t("selectStudent")} —</option>
                  {sectionStudents.map((s: Student) => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                  ))}
                </select>
                {!form.section_id && (
                  <p className="text-xs text-slate-400 mt-1">Select a section first</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("type")}</label>
                <select
                  value={form.type}
                  onChange={(e) => setField("type", e.target.value as GradeType)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("score")}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.score}
                    onChange={(e) => setField("score", e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    placeholder="e.g. 85"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("maxScore")}</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.max_score}
                    onChange={(e) => setField("max_score", e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                    placeholder="e.g. 100"
                  />
                </div>
              </div>
              {livePercentage !== null && (
                <div className="text-xs text-blue-600 font-medium">
                  {t("percentage")}: {livePercentage}%
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("date")}</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setField("date", e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("notes")}</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  placeholder={t("notesPlaceholder")}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => { setShowEnterModal(false); setForm(emptyForm); setFormError(null); }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleEnterGrade}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? tCommon("loading") : t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{tCommon("edit")} Grade</h2>
              <button onClick={() => setEditForm(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {editError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{editError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("type")}</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm((f) => f ? { ...f, type: e.target.value as GradeType } : null)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("score")}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.score}
                    onChange={(e) => setEditForm((f) => f ? { ...f, score: e.target.value } : null)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("maxScore")}</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editForm.max_score}
                    onChange={(e) => setEditForm((f) => f ? { ...f, max_score: e.target.value } : null)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("date")}</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm((f) => f ? { ...f, date: e.target.value } : null)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("notes")}</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => f ? { ...f, notes: e.target.value } : null)}
                  rows={2}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setEditForm(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleEditSave}
                disabled={editing}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {editing ? tCommon("loading") : tCommon("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">{tCommon("delete")}</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-slate-600">
                {t("deleteConfirm")}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? tCommon("loading") : tCommon("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}