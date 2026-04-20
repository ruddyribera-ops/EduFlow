"use client";

import { useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { useUsers } from "@/hooks/useUsers";
import type { ApiListResponse, User, UserRole } from "@/types";
import { ApiError } from "@/lib/api";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "counselor", label: "Counselor" },
  { value: "teacher", label: "Teacher" },
];

const STATUS_BADGE: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  counselor: "bg-blue-100 text-blue-700",
  teacher: "bg-green-100 text-green-700",
};

type FormState = {
  name: string;
  email: string;
  role: UserRole;
  password: string;
};

const emptyForm: FormState = { name: "", email: "", role: "teacher", password: "" };

export default function UsersPage() {
  const t = useTranslations();
  const { users, isLoading, error, create, updateUser, remove, resetPassword } = useUsers();

  // Modal state: "create" | "edit" | "resetpw" | null
  const [modal, setModal] = useState<"create" | "edit" | "resetpw" | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setConfirmDelete(false);
    setModal("create");
  }

  function openEdit(user: User) {
    setSelectedUser(user);
    setForm({ name: user.name, email: user.email, role: user.role, password: "" });
    setFormError(null);
    setConfirmDelete(false);
    setModal("edit");
  }

  function openResetPw(user: User) {
    setSelectedUser(user);
    setNewPassword("");
    setFormError(null);
    setModal("resetpw");
  }

  function closeModal() {
    setModal(null);
    setSelectedUser(null);
    setFormError(null);
    setConfirmDelete(false);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate() {
    setSaving(true);
    setFormError(null);
    try {
      await create(form);
      closeModal();
    } catch (err) {
      if (err instanceof ApiError && err.body && (err.body as any).errors) {
        const errors = (err.body as any).errors as Record<string, string[]>;
        const first = Object.values(errors)[0]?.[0] ?? err.message;
        setFormError(first);
      } else {
        setFormError(err instanceof ApiError ? err.message : "Error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!selectedUser) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload: Record<string, string> = { name: form.name, email: form.email, role: form.role };
      await updateUser(selectedUser.id, payload);
      closeModal();
    } catch (err) {
      if (err instanceof ApiError && (err.body as any).errors) {
        const errors = (err.body as any).errors as Record<string, string[]>;
        const first = Object.values(errors)[0]?.[0] ?? err.message;
        setFormError(first);
      } else {
        setFormError(err instanceof ApiError ? err.message : "Error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedUser) return;
    setSaving(true);
    setFormError(null);
    try {
      await remove(selectedUser.id);
      closeModal();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Error");
      setSaving(false);
    }
  }

  async function handleResetPw() {
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await resetPassword(selectedUser.id, newPassword);
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
          <h1 className="text-2xl font-bold text-slate-900">{t("users.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{users.length} {t("users.total")}</p>
        </div>
        <Button onClick={openCreate}>{t("users.add")}</Button>
      </div>

      {isLoading && <div className="text-slate-500">{t("common.loading")}</div>}
      {error && <div className="text-red-600">{t("common.error")}: {error}</div>}

      {users.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium text-slate-600">{t("users.table.name")}</th>
                <th className="px-4 py-2 font-medium text-slate-600">{t("users.table.email")}</th>
                <th className="px-4 py-2 font-medium text-slate-600">{t("users.table.role")}</th>
                <th className="px-4 py-2 font-medium text-slate-600">{t("users.table.createdAt")}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-2.5 text-slate-700">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[u.role] ?? "bg-slate-100 text-slate-700"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-xs text-slate-600 hover:text-slate-900"
                      >
                        {t("users.edit")}
                      </button>
                      <button
                        onClick={() => openResetPw(u)}
                        className="text-xs text-slate-600 hover:text-slate-900"
                      >
                        {t("users.resetPassword")}
                      </button>
                      <button
                        onClick={() => { setSelectedUser(u); setConfirmDelete(true); setModal("edit"); }}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        {t("users.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={modal === "create"}
        onClose={closeModal}
        title={t("users.add")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button onClick={handleCreate} loading={saving}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</div>}
          <FormField label={t("users.form.name")}>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </FormField>
          <FormField label={t("users.form.email")}>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </FormField>
          <FormField label={t("users.form.role")}>
            <Select
              value={form.role}
              onChange={(e) => set("role", e.target.value as UserRole)}
              options={ROLE_OPTIONS}
            />
          </FormField>
          <FormField label={t("users.form.password")}>
            <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} />
          </FormField>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={modal === "edit" && !confirmDelete}
        onClose={closeModal}
        title={t("users.edit")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button onClick={handleEdit} loading={saving}>{t("common.save")}</Button>
          </>
        }
      >
        {selectedUser && (
          <div className="space-y-3">
            {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</div>}
            <FormField label={t("users.form.name")}>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </FormField>
            <FormField label={t("users.form.email")}>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </FormField>
            <FormField label={t("users.form.role")}>
              <Select
                value={form.role}
                onChange={(e) => set("role", e.target.value as UserRole)}
                options={ROLE_OPTIONS}
              />
            </FormField>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={modal === "edit" && confirmDelete}
        onClose={closeModal}
        title={t("users.delete")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button variant="danger" onClick={handleDelete} loading={saving}>{t("users.delete")}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          {t("users.confirmDelete", { name: selectedUser?.name ?? "" })}
        </p>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={modal === "resetpw"}
        onClose={closeModal}
        title={t("users.resetPassword")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button onClick={handleResetPw} loading={saving}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</div>}
          <FormField label={t("users.form.newPassword")}>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder={t("users.form.minChars")}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
