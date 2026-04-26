"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { swrFetcher } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { useStudents } from "@/hooks/useStudents";
import { useGuardians } from "@/hooks/useGuardians";
import { useSections } from "@/hooks/useSections";
import type { ApiResource, Student, Guardian, CommunicationPreference, EnrollmentStatus, Section, ApiListResponse, RiskAlert } from "@/types";
import { ApiError } from "@/lib/api";

const PREF_LABEL: Record<CommunicationPreference, string> = {
  email_only: "common.emailOnly",
  sms_only: "common.smsOnly",
  both: "common.both",
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

const COMM_OPTIONS = [
  { value: "email_only", label: "Email Only" },
  { value: "sms_only", label: "SMS Only" },
  { value: "both", label: "Email + SMS" },
];

type StudentFormState = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  grade_level: string;
  enrollment_status: EnrollmentStatus;
  section_id: string;
};

type GuardianFormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  communication_preference: CommunicationPreference;
  relationship_type: string;
};

export default function StudentDetailPage() {
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const t = useTranslations();
  const { data, error, isLoading, mutate: revalidateStudent } = useSWR<ApiResource<Student>>(
    params.id ? `/students/${params.id}` : null,
    swrFetcher
  );
  const { updateStudent } = useStudents();
  const { guardians, create, attachToStudent, detachFromStudent } = useGuardians();
  const { sections } = useSections();

  const [modal, setModal] = useState<"editStudent" | "addGuardian" | "detachGuardian" | null>(null);
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Student edit form
  const [studentForm, setStudentForm] = useState<StudentFormState>({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    grade_level: "",
    enrollment_status: "inquiry",
    section_id: "",
  });

  // Guardian create form
  const [guardianForm, setGuardianForm] = useState<GuardianFormState>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    communication_preference: "both",
    relationship_type: "",
  });

  function openEditStudent(s: Student) {
    setStudentForm({
      first_name: s.first_name,
      last_name: s.last_name,
      date_of_birth: s.date_of_birth ?? "",
      grade_level: s.grade_level,
      enrollment_status: s.enrollment_status,
      section_id: s.section_id ?? "",
    });
    setFormError(null);
    setModal("editStudent");
  }

  function openAddGuardian() {
    setGuardianForm({ first_name: "", last_name: "", email: "", phone: "", communication_preference: "both", relationship_type: "" });
    setFormError(null);
    setModal("addGuardian");
  }

  function openDetachGuardian(g: Guardian) {
    setSelectedGuardian(g);
    setFormError(null);
    setModal("detachGuardian");
  }

  function closeModal() {
    setModal(null);
    setSelectedGuardian(null);
    setFormError(null);
  }

  function setStudent<K extends keyof StudentFormState>(key: K, value: StudentFormState[K]) {
    setStudentForm((f) => ({ ...f, [key]: value }));
  }

  function setGuardian<K extends keyof GuardianFormState>(key: K, value: GuardianFormState[K]) {
    setGuardianForm((f) => ({ ...f, [key]: value }));
  }

  async function handleEditStudent() {
    if (!data) return;
    setSaving(true);
    setFormError(null);
    try {
      await updateStudent(data.data.id, {
        first_name: studentForm.first_name,
        last_name: studentForm.last_name,
        date_of_birth: studentForm.date_of_birth || undefined,
        grade_level: studentForm.grade_level,
        enrollment_status: studentForm.enrollment_status,
        section_id: studentForm.section_id || undefined,
      });
      revalidateStudent();
      closeModal();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddGuardian() {
    if (!data) return;
    setSaving(true);
    setFormError(null);
    try {
      const created = await create({
        first_name: guardianForm.first_name,
        last_name: guardianForm.last_name,
        email: guardianForm.email,
        phone: guardianForm.phone || undefined,
        communication_preference: guardianForm.communication_preference,
      });
      await attachToStudent(data.data.id, {
        guardian_id: (created as any).id ?? created,
        relationship_type: guardianForm.relationship_type,
        is_emergency_contact: false,
        can_pickup: true,
      });
      revalidateStudent();
      closeModal();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDetachGuardian() {
    if (!data || !selectedGuardian) return;
    setSaving(true);
    setFormError(null);
    try {
      await detachFromStudent(data.data.id, selectedGuardian.id);
      revalidateStudent();
      closeModal();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  const sectionOptions = sections.map((s: Section) => ({
    value: s.id,
    label: `${s.name} (${s.grade_level})`,
  }));

  if (isLoading) return <div className="p-6 text-slate-500">{t("common.loading")}</div>;
  if (error) return <div className="p-6 text-red-600">{t("common.error")}: {error.message}</div>;
  if (!data) return null;

  const s = data.data;

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/${locale}/students`} className="text-sm text-slate-500 hover:text-slate-900">{t("students.detail.backToStudents")}</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">{s.first_name} {s.last_name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {s.grade_level} · <span className="capitalize">{s.enrollment_status}</span>
            {s.date_of_birth && ` · ${t("students.detail.birthDate")} ${new Date(s.date_of_birth).toLocaleDateString()}`}
          </p>
        </div>
        <Button variant="secondary" onClick={() => openEditStudent(s)}>{t("students.edit")}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Section card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-900 mb-3">{t("students.detail.section")}</h2>
          {s.section ? (
            <div>
              <div className="font-medium text-slate-900">{s.section.name}</div>
              <div className="text-sm text-slate-600 mt-1">
                {t("sections.grade")} {s.section.grade_level}
                {s.section.room && ` · ${t("sections.room")} ${s.section.room}`}
              </div>
              {s.section.teacher && (
                <div className="text-sm text-slate-600 mt-2">
                  {t("sections.teacher")}: <span className="text-slate-900">{s.section.teacher.name}</span>
                </div>
              )}
              {s.section.counselor && (
                <div className="text-sm text-slate-600">
                  {t("sections.counselor")}: <span className="text-slate-900">{s.section.counselor.name}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-500">{t("students.detail.notAssigned")}</div>
          )}
        </div>

        {/* Guardians card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">{t("students.detail.guardians")} ({s.guardians?.length ?? 0})</h2>
            <Button variant="secondary" onClick={openAddGuardian}>{t("students.detail.addGuardian")}</Button>
          </div>
          {s.guardians && s.guardians.length > 0 ? (
            <div className="space-y-3">
              {s.guardians.map((g) => (
                <div key={g.id} className="text-sm border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="font-medium text-slate-900">
                      {g.first_name} {g.last_name}
                      {g.relationship_type && (
                        <span className="ml-2 text-xs font-normal text-slate-500">({g.relationship_type})</span>
                      )}
                    </div>
                    <button onClick={() => openDetachGuardian(g)} className="text-xs text-red-600 hover:text-red-800 ml-2">
                      {t("students.detail.removeGuardian")}
                    </button>
                  </div>
                  <div className="text-slate-600 mt-0.5">{g.email}</div>
                  {g.phone && <div className="text-slate-600">{g.phone}</div>}
                  <div className="text-xs text-slate-500 mt-1">
                    {t("students.detail.contact")} {t(PREF_LABEL[g.communication_preference])}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">{t("students.detail.noGuardians")}</div>
          )}
        </div>
      </div>

      {/* Risk History Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">{t("students.detail.riskHistory")}</h2>
          <Link
            href={`/${locale}/risk-alerts`}
            className="text-xs text-blue-600 hover:underline"
          >
            {t("students.detail.viewAllAlerts")} →
          </Link>
        </div>
        <StudentRiskAlerts studentId={params.id} />
      </div>

      {/* Edit Student Modal */}
      <Modal
        open={modal === "editStudent"}
        onClose={closeModal}
        title={t("students.edit")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button onClick={handleEditStudent} loading={saving}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("students.form.firstName")}>
              <Input value={studentForm.first_name} onChange={(e) => setStudent("first_name", e.target.value)} required />
            </FormField>
            <FormField label={t("students.form.lastName")}>
              <Input value={studentForm.last_name} onChange={(e) => setStudent("last_name", e.target.value)} required />
            </FormField>
          </div>
          <FormField label={t("students.form.dateOfBirth")}>
            <Input type="date" value={studentForm.date_of_birth} onChange={(e) => setStudent("date_of_birth", e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("students.form.gradeLevel")}>
              <Select
                value={studentForm.grade_level}
                onChange={(e) => setStudent("grade_level", e.target.value)}
                options={GRADE_OPTIONS}
              />
            </FormField>
            <FormField label={t("students.form.enrollmentStatus")}>
              <Select
                value={studentForm.enrollment_status}
                onChange={(e) => setStudent("enrollment_status", e.target.value as EnrollmentStatus)}
                options={STATUS_OPTIONS}
              />
            </FormField>
          </div>
          <FormField label={t("students.form.section")}>
            <Select
              value={studentForm.section_id}
              onChange={(e) => setStudent("section_id", e.target.value)}
              options={[{ value: "", label: t("students.form.noSection") }, ...sectionOptions]}
            />
          </FormField>
        </div>
      </Modal>

      {/* Add Guardian Modal */}
      <Modal
        open={modal === "addGuardian"}
        onClose={closeModal}
        title={t("students.detail.addGuardian")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button onClick={handleAddGuardian} loading={saving}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("guardians.form.firstName")}>
              <Input value={guardianForm.first_name} onChange={(e) => setGuardian("first_name", e.target.value)} required />
            </FormField>
            <FormField label={t("guardians.form.lastName")}>
              <Input value={guardianForm.last_name} onChange={(e) => setGuardian("last_name", e.target.value)} required />
            </FormField>
          </div>
          <FormField label={t("guardians.form.email")}>
            <Input type="email" value={guardianForm.email} onChange={(e) => setGuardian("email", e.target.value)} required />
          </FormField>
          <FormField label={t("guardians.form.phone")}>
            <Input value={guardianForm.phone} onChange={(e) => setGuardian("phone", e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("guardians.form.communicationPreference")}>
              <Select
                value={guardianForm.communication_preference}
                onChange={(e) => setGuardian("communication_preference", e.target.value as CommunicationPreference)}
                options={COMM_OPTIONS}
              />
            </FormField>
            <FormField label={t("guardians.form.relationshipType")}>
              <Input value={guardianForm.relationship_type} onChange={(e) => setGuardian("relationship_type", e.target.value)} placeholder="e.g. Mother, Father" />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Detach Guardian Confirm */}
      <Modal
        open={modal === "detachGuardian"}
        onClose={closeModal}
        title={t("students.detail.removeGuardian")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button variant="danger" onClick={handleDetachGuardian} loading={saving}>{t("students.detail.removeGuardian")}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          {t("students.detail.confirmRemoveGuardian", { name: selectedGuardian ? `${selectedGuardian.first_name} ${selectedGuardian.last_name}` : "" })}
        </p>
      </Modal>
    </div>
  );
}

function StudentRiskAlerts({ studentId }: { studentId: string }) {
  const t = useTranslations();
  const { data, error, isLoading } = useSWR<ApiListResponse<RiskAlert>>(
    `/students/${studentId}/risk-alerts`,
    swrFetcher
  );

  if (isLoading) return <div className="text-sm text-slate-500">{t("common.loading")}</div>;
  if (error) return <div className="text-sm text-red-600">{t("common.error")}</div>;

  const alerts = data?.data ?? [];

  if (alerts.length === 0) {
    return <div className="text-sm text-slate-500">{t("students.detail.noRiskAlerts")}</div>;
  }

  return (
    <div className="space-y-2">
      {alerts.slice(0, 5).map((alert) => (
        <div key={alert.id} className="flex items-start justify-between gap-3 text-sm border-b border-slate-100 last:border-0 pb-2 last:pb-0">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                alert.status === "pending" ? "bg-red-100 text-red-700" :
                alert.status === "reviewed" ? "bg-yellow-100 text-yellow-700" :
                "bg-green-100 text-green-700"
              }`}>
                {t(`riskAlerts.${alert.status}`)}
              </span>
              <div className="flex gap-1 flex-wrap">
                {alert.risk_factors.map((f) => (
                  <span key={f} className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                    {t(f === "low_attendance" ? "riskAlerts.attendance" : "riskAlerts.gradeDrop")}
                  </span>
                ))}
              </div>
            </div>
            {alert.notes && <div className="text-slate-600 mt-0.5 text-xs">{alert.notes}</div>}
            <div className="text-xs text-slate-400 mt-0.5">
              {t("riskAlerts.attendance")}: {(alert.attendance_rate * 100).toFixed(0)}%
              {alert.grade_drop_percentage > 0 && ` · ${t("riskAlerts.gradeDrop")}: -${(alert.grade_drop_percentage * 100).toFixed(0)}%`}
              {' · '}{new Date(alert.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
