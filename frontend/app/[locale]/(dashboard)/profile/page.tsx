"use client";

import { useState } from "react";
import useSWR from "swr";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { apiFetch, swrFetcher } from "@/lib/api";
import { getUser, clearSession, saveSession } from "@/lib/auth";
import type { ApiResource, User } from "@/types";
import { ApiError } from "@/lib/api";

type ProfileFormState = {
  name: string;
  email: string;
};

type PasswordFormState = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

export default function ProfilePage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const { data: meData, mutate: revalidateMe } = useSWR<ApiResource<User>>("/auth/me", swrFetcher);

  const currentUser = meData?.data ?? getUser();

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: currentUser?.name ?? "",
    email: currentUser?.email ?? "",
  });
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [emailChanged, setEmailChanged] = useState(false);

  function setProfile<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setProfileForm((f) => ({ ...f, [key]: value }));
  }

  function setPassword<K extends keyof PasswordFormState>(key: K, value: PasswordFormState[K]) {
    setPasswordForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);
    setEmailChanged(false);
    try {
      const updated = await apiFetch<User>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(profileForm),
      });
      // Update localStorage session with new user data
      const token = localStorage.getItem("eduflow_token");
      if (token && updated) {
        saveSession(token, updated);
      }
      // If email changed, we need to re-login
      if (updated.email !== currentUser?.email) {
        setEmailChanged(true);
      } else {
        setProfileSuccess(true);
        revalidateMe();
      }
    } catch (err) {
      if (err instanceof ApiError && (err.body as any)?.errors) {
        const errors = (err.body as any).errors as Record<string, string[]>;
        setProfileError(Object.values(errors)[0]?.[0] ?? err.message);
      } else {
        setProfileError(err instanceof ApiError ? err.message : "Error");
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (passwordForm.password !== passwordForm.password_confirmation) {
      setPasswordError(t("profile.passwordMismatch"));
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    try {
      await apiFetch("/auth/password", {
        method: "PATCH",
        body: JSON.stringify(passwordForm),
      });
      setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
      setPasswordSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && (err.body as any)?.errors) {
        const errors = (err.body as any).errors as Record<string, string[]>;
        setPasswordError(Object.values(errors)[0]?.[0] ?? err.message);
      } else {
        setPasswordError(err instanceof ApiError ? err.message : "Error");
      }
    } finally {
      setSavingPassword(false);
    }
  }

  function handleLogoutAfterEmailChange() {
    clearSession();
    router.replace(`/${locale}/login`);
  }

  if (!currentUser) {
    return <div className="p-6 text-slate-500">{t("common.loading")}</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("profile.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{currentUser.role}</p>
      </div>

      {/* Profile info card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">{t("profile.profileInfo")}</h2>

        {profileSuccess && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            {t("profile.saved")}
          </div>
        )}

        {emailChanged && (
          <div className="space-y-3">
            <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
              {t("profile.emailChangedNotice")}
            </div>
            <Button onClick={handleLogoutAfterEmailChange}>{t("profile.relogin")}</Button>
          </div>
        )}

        {!emailChanged && (
          <>
            <FormField label={t("profile.form.name")}>
              <Input
                value={profileForm.name}
                onChange={(e) => setProfile("name", e.target.value)}
              />
            </FormField>
            <FormField label={t("profile.form.email")}>
              <Input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfile("email", e.target.value)}
              />
            </FormField>

            {profileError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {profileError}
              </div>
            )}

            <Button onClick={handleSaveProfile} loading={savingProfile}>
              {t("common.save")}
            </Button>
          </>
        )}
      </div>

      {/* Change password card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">{t("profile.changePassword")}</h2>

        {passwordSuccess && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            {t("profile.passwordChanged")}
          </div>
        )}

        <FormField label={t("profile.form.currentPassword")}>
          <Input
            type="password"
            value={passwordForm.current_password}
            onChange={(e) => setPassword("current_password", e.target.value)}
          />
        </FormField>
        <FormField label={t("profile.form.newPassword")}>
          <Input
            type="password"
            value={passwordForm.password}
            onChange={(e) => setPassword("password", e.target.value)}
          />
        </FormField>
        <FormField label={t("profile.form.confirmPassword")}>
          <Input
            type="password"
            value={passwordForm.password_confirmation}
            onChange={(e) => setPassword("password_confirmation", e.target.value)}
          />
        </FormField>

        {passwordError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {passwordError}
          </div>
        )}

        <Button onClick={handleChangePassword} loading={savingPassword}>
          {t("profile.updatePassword")}
        </Button>
      </div>
    </div>
  );
}
