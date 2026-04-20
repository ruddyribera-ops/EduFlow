"use client";

import { useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { useSections } from "@/hooks/useSections";
import { useUsers } from "@/hooks/useUsers";
import { swrFetcher } from "@/lib/api";
import type { ApiListResponse, Section, User, Student } from "@/types";
import { ApiError } from "@/lib/api";

const SEMESTER_OPTIONS = [
  { value: "fall", label: "Fall" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
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

type SectionFormState = {
  name: string;
  grade_level: string;
  room: string;
  semester: "fall" | "spring" | "summer";
  counselor_id: string;
};

const emptyForm: SectionFormState = {
  name: "",
  grade_level: "4th",
  room: "",
  semester: "fall",
  counselor_id: "",
};

export default function SectionsPage() {
  const t = useTranslations();
  const { sections, isLoading, error, create, updateSection, remove, assignTeacher, removeTeacher, assignStudent, removeStudent } = useSections();
  const { users } = useUsers();

  // Modal state
  const [modal, setModal] = useState<"create" | "edit" | "roster" | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [form, setForm] = useState<SectionFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Roster tab
  const [rosterTab, setRosterTab] = useState<"students" | "teachers">("students");
  const [searchStudent, setSearchStudent] = useState("");
  const [searchTeacher, setSearchTeacher] = useState("");

  // Students data for roster
  const { data: allStudentsData } = useSWR<ApiListResponse<Student>>("/students", swrFetcher);
  const allStudents = allStudentsData?.data ?? [];

  // Teachers (filtered from users)
  const teachers = users.filter((u: User) => u.role === "teacher");

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setConfirmDelete(false);
    setModal("create");
  }

  function openEdit(section: Section) {
    setSelectedSection(section);
    setForm({
      name: section.name,
      grade_level: section.grade_level,
      room: section.room ?? "",
      semester: section.semester as "fall" | "spring" | "summer",
      counselor_id: section.counselor_id ?? "",
    });
    setFormError(null);
    setConfirmDelete(false);
    setModal("edit");
  }

  function openRoster(section: Section) {
    setSelectedSection(section);
    setFormError(null);
    setModal("roster");
  }

  function closeModal() {
    setModal(null);
    setSelectedSection(null);
    setFormError(null);
    setConfirmDelete(false);
  }

  function set<K extends keyof SectionFormState>(key: K, value: SectionFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate() {
    setSaving(true);
    setFormError(null);
    try {
      await create({
        name: form.name,
        grade_level: form.grade_level,
        room: form.room || undefined,
        semester: form.semester,
        counselor_id: form.counselor_id || undefined,
      });
      closeModal();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!selectedSection) return;
    setSaving(true);
    setFormError(null);
    try {
      await updateSection(selectedSection.id, {
        name: form.name,
        grade_level: form.grade_level,
        room: form.room || undefined,
        semester: form.semester,
        counselor_id: form.counselor_id || undefined,
      });
      closeModal();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedSection) return;
    setSaving(true);
    setFormError(null);
    try {
      await remove(selectedSection.id);
      closeModal();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  const counselorOptions = [
    { value: "", label: "—" },
    ...users
      .filter((u: User) => u.role === "counselor" || u.role === "admin")
      .map((u: User) => ({ value: u.id, label: u.name })),
  ];

  const assignedStudentIds = new Set(selectedSection?.students?.map((s) => s.id) ?? []);
  const availableStudents = allStudents.filter(
    (s: Student) => !assignedStudentIds.has(s.id)
  );
  const filteredAvailableStudents = availableStudents.filter((s: Student) => {
    if (!searchStudent) return true;
    return `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchStudent.toLowerCase());
  });

  const assignedTeacherIds = new Set(selectedSection?.teachers?.map((u) => u.id) ?? []);
  const availableTeachers = teachers.filter((u: User) => !assignedTeacherIds.has(u.id));
  const filteredAvailableTeachers = availableTeachers.filter((u: User) => {
    if (!searchTeacher) return true;
    return u.name.toLowerCase().includes(searchTeacher.toLowerCase());
  });

  async function handleAssignStudent(studentId: string) {
    if (!selectedSection) return;
    try {
      await assignStudent(selectedSection.id, studentId);
      const updated = sections.find((s) => s.id === selectedSection.id);
      if (updated) setSelectedSection({ ...selectedSection, students: updated.students });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function handleRemoveStudent(studentId: string) {
    if (!selectedSection) return;
    try {
      await removeStudent(selectedSection.id, studentId);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function handleAssignTeacher(teacherId: string) {
    if (!selectedSection) return;
    try {
      await assignTeacher(selectedSection.id, teacherId);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function handleRemoveTeacher(teacherId: string) {
    if (!selectedSection) return;
    try {
      await removeTeacher(selectedSection.id, teacherId);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Error");
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("sections.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{sections.length} {t("sections.sections")}</p>
        </div>
        <Button onClick={openCreate}>{t("sections.add")}</Button>
      </div>

      {isLoading && <div className="text-slate-500">{t("common.loading")}</div>}
      {error && <div className="text-red-600">{t("common.error")}: {error}</div>}

      {sections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((sec: Section) => (
            <div key={sec.id} className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{sec.name}</h3>
                  <div className="text-sm text-slate-500 mt-1">
                    {t("sections.grade")} {sec.grade_level}
                    {sec.room && ` · ${t("sections.room")} ${sec.room}`}
                  </div>
                </div>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded capitalize">
                  {sec.semester}
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-sm">
                <div className="text-slate-600">
                  {t("sections.students")}: <span className="text-slate-900 font-medium">{sec.students?.length ?? 0}</span>
                </div>
                <div className="text-slate-600">
                  {t("sections.teacher")}: <span className="text-slate-900">{sec.teachers?.[0]?.name ?? "—"}</span>
                </div>
                <div className="text-slate-600">
                  {t("sections.counselor")}: <span className="text-slate-900">{sec.counselor?.name ?? "—"}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => openRoster(sec)}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  {t("sections.manageRoster")}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(sec)} className="text-xs text-slate-600 hover:text-slate-900">
                    {t("sections.edit")}
                  </button>
                  <button onClick={() => { setSelectedSection(sec); setConfirmDelete(true); }} className="text-xs text-red-600 hover:text-red-800">
                    {t("sections.delete")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {sections.length === 0 && !isLoading && (
        <div className="text-center text-slate-500 py-8">{t("sections.noSections")}</div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modal === "create" || modal === "edit"}
        onClose={closeModal}
        title={modal === "create" ? t("sections.add") : t("sections.edit")}
        footer={
          <>
            {modal === "edit" && (
              <Button
                variant="danger"
                onClick={() => setConfirmDelete(true)}
                className="mr-auto"
              >
                {t("sections.delete")}
              </Button>
            )}
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button onClick={modal === "create" ? handleCreate : handleEdit} loading={saving}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</div>}
          <FormField label={t("sections.form.name")}>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("sections.form.gradeLevel")}>
              <Select
                value={form.grade_level}
                onChange={(e) => set("grade_level", e.target.value)}
                options={GRADE_OPTIONS}
              />
            </FormField>
            <FormField label={t("sections.form.semester")}>
              <Select
                value={form.semester}
                onChange={(e) => set("semester", e.target.value as SectionFormState["semester"])}
                options={SEMESTER_OPTIONS}
              />
            </FormField>
          </div>
          <FormField label={t("sections.form.room")}>
            <Input value={form.room} onChange={(e) => set("room", e.target.value)} />
          </FormField>
          <FormField label={t("sections.form.counselor")}>
            <Select
              value={form.counselor_id}
              onChange={(e) => set("counselor_id", e.target.value)}
              options={counselorOptions}
            />
          </FormField>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={confirmDelete}
        onClose={closeModal}
        title={t("sections.delete")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button variant="danger" onClick={handleDelete} loading={saving}>{t("sections.delete")}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          {t("sections.confirmDelete", { name: selectedSection?.name ?? "" })}
        </p>
      </Modal>

      {/* Manage Roster Modal */}
      <Modal
        open={modal === "roster"}
        onClose={closeModal}
        title={t("sections.manageRoster")}
      >
        <div className="space-y-3">
          {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</div>}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setRosterTab("students")}
              className={`text-sm px-3 py-1 rounded ${rosterTab === "students" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}
            >
              {t("sections.students")} ({selectedSection?.students?.length ?? 0})
            </button>
            <button
              onClick={() => setRosterTab("teachers")}
              className={`text-sm px-3 py-1 rounded ${rosterTab === "teachers" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}
            >
              {t("sections.teachers")} ({selectedSection?.teachers?.length ?? 0})
            </button>
          </div>

          {rosterTab === "students" && (
            <div className="space-y-3">
              {/* Assigned students */}
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase mb-2">{t("sections.assigned")}</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(selectedSection?.students ?? []).length === 0 && (
                    <div className="text-sm text-slate-400">{t("sections.noStudentsAssigned")}</div>
                  )}
                  {selectedSection?.students?.map((s: Student) => (
                    <div key={s.id} className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-1.5">
                      <span className="text-slate-700">{s.first_name} {s.last_name}</span>
                      <button
                        onClick={() => handleRemoveStudent(s.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        {t("sections.remove")}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {/* Add student */}
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase mb-2">{t("sections.addStudent")}</div>
                <Input
                  placeholder={t("sections.searchStudent")}
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                />
                <div className="space-y-1 max-h-40 overflow-y-auto mt-1">
                  {filteredAvailableStudents.slice(0, 10).map((s: Student) => (
                    <div key={s.id} className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-1.5">
                      <span className="text-slate-700">{s.first_name} {s.last_name}</span>
                      <button
                        onClick={() => handleAssignStudent(s.id)}
                        className="text-xs text-slate-900 hover:text-slate-700 font-medium"
                      >
                        + {t("sections.add")}
                      </button>
                    </div>
                  ))}
                  {filteredAvailableStudents.length === 0 && (
                    <div className="text-sm text-slate-400 py-2">{t("sections.noStudentsAvailable")}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {rosterTab === "teachers" && (
            <div className="space-y-3">
              {/* Assigned teachers */}
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase mb-2">{t("sections.assigned")}</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(selectedSection?.teachers ?? []).length === 0 && (
                    <div className="text-sm text-slate-400">{t("sections.noTeachersAssigned")}</div>
                  )}
                  {selectedSection?.teachers?.map((u: User) => (
                    <div key={u.id} className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-1.5">
                      <span className="text-slate-700">{u.name}</span>
                      <button
                        onClick={() => handleRemoveTeacher(u.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        {t("sections.remove")}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {/* Add teacher */}
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase mb-2">{t("sections.addTeacher")}</div>
                <Input
                  placeholder={t("sections.searchTeacher")}
                  value={searchTeacher}
                  onChange={(e) => setSearchTeacher(e.target.value)}
                />
                <div className="space-y-1 max-h-40 overflow-y-auto mt-1">
                  {filteredAvailableTeachers.slice(0, 10).map((u: User) => (
                    <div key={u.id} className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-1.5">
                      <span className="text-slate-700">{u.name}</span>
                      <button
                        onClick={() => handleAssignTeacher(u.id)}
                        className="text-xs text-slate-900 hover:text-slate-700 font-medium"
                      >
                        + {t("sections.add")}
                      </button>
                    </div>
                  ))}
                  {filteredAvailableTeachers.length === 0 && (
                    <div className="text-sm text-slate-400 py-2">{t("sections.noTeachersAvailable")}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
