"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { useStudents } from "@/hooks/useStudents";
import { useSections } from "@/hooks/useSections";
import type { Student, EnrollmentStatus, Section } from "@/types";
import { ApiError } from "@/lib/api";

const STATUS_BADGE: Record<EnrollmentStatus, string> = {
  inquiry: "bg-slate-100 text-slate-700",
  applied: "bg-blue-100 text-blue-700",
  accepted: "bg-indigo-100 text-indigo-700",
  enrolled: "bg-green-100 text-green-700",
  withdrawn: "bg-amber-100 text-amber-700",
  graduated: "bg-purple-100 text-purple-700",
};

const STATUS_OPTIONS = [
  { value: "inquiry", label: "Inquiry" },
  { value: "applied", label: "Applied" },
  { value: "accepted", label: "Accepted" },
  { value: "enrolled", label: "Enrolled" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "graduated", label: "Graduated" },
];

const GRADE_OPTIONS = [
  { value: "2nd", label: "2nd Grade" },
  { value: "3rd", label: "3rd Grade" },
  { value: "4th", label: "4th Grade" },
  { value: "5th", label: "5th Grade" },
  { value: "6th", label: "6th Grade" },
  { value: "7th", label: "7th Grade" },
  { value: "8th", label: "8th Grade" },
  { value: "9th", label: "9th Grade" },
  { value: "10th", label: "10th Grade" },
  { value: "11th", label: "11th Grade" },
  { value: "12th", label: "12th Grade" },
];

type FormState = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  grade_level: string;
  enrollment_status: EnrollmentStatus;
  section_id: string;
};

const emptyForm: FormState = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  grade_level: "4th",
  enrollment_status: "inquiry",
  section_id: "",
};

export default function StudentsPage() {
  const t = useTranslations();
  const { students, isLoading, error, create, updateStudent, remove } = useStudents();
  const { sections } = useSections();
  const [grade, setGrade] = useState("");
  const [status, setStatus] = useState("");

  // Modal state
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sectionOptions = sections.map((s: Section) => ({
    value: s.id,
    label: `${s.name} (${s.grade_level})`,
  }));

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setConfirmDelete(false);
    setModal("create");
  }

  function openEdit(student: Student) {
    setSelectedStudent(student);
    setForm({
      first_name: student.first_name,
      last_name: student.last_name,
      date_of_birth: student.date_of_birth ?? "",
      grade_level: student.grade_level,
      enrollment_status: student.enrollment_status,
      section_id: student.section_id ?? "",
    });
    setFormError(null);
    setConfirmDelete(false);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setSelectedStudent(null);
    setFormError(null);
    setConfirmDelete(false);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const filtered = students.filter((s: Student) => {
    if (grade && s.grade_level !== grade) return false;
    if (status && s.enrollment_status !== status) return false;
    return true;
  });

  async function handleCreate() {
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        date_of_birth: form.date_of_birth || undefined,
        grade_level: form.grade_level,
        enrollment_status: form.enrollment_status,
        section_id: form.section_id || undefined,
      };
      await create(payload);
      closeModal();
    } catch (err) {
      if (err instanceof ApiError && (err.body as any)?.errors) {
        const errors = (err.body as any).errors as Record<string, string[]>;
        setFormError(Object.values(errors)[0]?.[0] ?? err.message);
      } else {
        setFormError(err instanceof ApiError ? err.message : "Error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!selectedStudent) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        date_of_birth: form.date_of_birth || undefined,
        grade_level: form.grade_level,
        enrollment_status: form.enrollment_status,
        section_id: form.section_id || undefined,
      };
      await updateStudent(selectedStudent.id, payload);
      closeModal();
    } catch (err) {
      if (err instanceof ApiError && (err.body as any)?.errors) {
        const errors = (err.body as any).errors as Record<string, string[]>;
        setFormError(Object.values(errors)[0]?.[0] ?? err.message);
      } else {
        setFormError(err instanceof ApiError ? err.message : "Error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedStudent) return;
    setSaving(true);
    setFormError(null);
    try {
      await remove(selectedStudent.id);
      closeModal();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("students.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} {t("students.total")}</p>
        </div>
        <Button onClick={openCreate}>{t("students.add")}</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-lg p-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("students.filters.gradeLevel")}</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">{t("students.filters.allGrades")}</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("students.filters.enrollmentStatus")}</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">{t("students.filters.allStatuses")}</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {(grade || status) && (
          <button
            onClick={() => { setGrade(""); setStatus(""); }}
            className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1.5"
          >
            {t("students.filters.clearFilters")}
          </button>
        )}
      </div>

      {isLoading && <div className="text-slate-500">{t("common.loading")}</div>}
      {error && <div className="text-red-600">{t("common.error")}: {error}</div>}

      {filtered.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium text-slate-600">{t("students.table.name")}</th>
                <th className="px-4 py-2 font-medium text-slate-600">{t("students.table.grade")}</th>
                <th className="px-4 py-2 font-medium text-slate-600">{t("students.table.status")}</th>
                <th className="px-4 py-2 font-medium text-slate-600">{t("students.table.section")}</th>
                <th className="px-4 py-2 font-medium text-slate-600">{t("students.table.guardians")}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s: Student) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{s.first_name} {s.last_name}</td>
                  <td className="px-4 py-2.5 text-slate-700">{s.grade_level}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[s.enrollment_status]}`}>
                      {s.enrollment_status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{s.section?.name ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-2.5 text-slate-700">{s.guardians?.length ?? 0}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(s)} className="text-xs text-slate-600 hover:text-slate-900">
                        {t("students.edit")}
                      </button>
                      <button onClick={() => { setSelectedStudent(s); setConfirmDelete(true); }} className="text-xs text-red-600 hover:text-red-800">
                        {t("students.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-8 text-center text-slate-500">
          {t("students.table.noResults")}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modal !== null && !confirmDelete}
        onClose={closeModal}
        title={modal === "create" ? t("students.add") : t("students.edit")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button onClick={modal === "create" ? handleCreate : handleEdit} loading={saving}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("students.form.firstName")}>
              <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required />
            </FormField>
            <FormField label={t("students.form.lastName")}>
              <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required />
            </FormField>
          </div>
          <FormField label={t("students.form.dateOfBirth")}>
            <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("students.form.gradeLevel")}>
              <Select
                value={form.grade_level}
                onChange={(e) => set("grade_level", e.target.value)}
                options={GRADE_OPTIONS}
              />
            </FormField>
            <FormField label={t("students.form.enrollmentStatus")}>
              <Select
                value={form.enrollment_status}
                onChange={(e) => set("enrollment_status", e.target.value as EnrollmentStatus)}
                options={STATUS_OPTIONS}
              />
            </FormField>
          </div>
          <FormField label={t("students.form.section")}>
            <Select
              value={form.section_id}
              onChange={(e) => set("section_id", e.target.value)}
              options={[{ value: "", label: t("students.form.noSection") }, ...sectionOptions]}
              placeholder={t("students.form.selectSection")}
            />
          </FormField>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={confirmDelete}
        onClose={closeModal}
        title={t("students.delete")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button variant="danger" onClick={handleDelete} loading={saving}>{t("students.delete")}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          {t("students.confirmDelete", { name: selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : "" })}
        </p>
      </Modal>
    </div>
  );
}
