"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { useLeads } from "@/hooks/useLeads";
import { STAGE_LABELS, STAGE_COLORS, PIPELINE_STAGES } from "@/lib/constants";
import type { Lead, LeadStatus } from "@/types";
import { ApiError } from "@/lib/api";

type LeadFormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  source_campaign: string;
  notes: string;
};

const emptyForm: LeadFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  source_campaign: "",
  notes: "",
};

export default function AdmissionsPage() {
  const t = useTranslations();
  const { leads, isLoading, error, create, updateLead, remove, updateLeadStatus } = useLeads();

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setConfirmDelete(false);
    setModal("create");
  }

  function openEdit(lead: Lead) {
    setSelectedLead(lead);
    setForm({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone ?? "",
      source_campaign: lead.source_campaign ?? "",
      notes: lead.notes ?? "",
    });
    setFormError(null);
    setConfirmDelete(false);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setSelectedLead(null);
    setFormError(null);
    setConfirmDelete(false);
  }

  function set<K extends keyof LeadFormState>(key: K, value: LeadFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate() {
    setSaving(true);
    setFormError(null);
    try {
      await create(form);
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
    if (!selectedLead) return;
    setSaving(true);
    setFormError(null);
    try {
      await updateLead(selectedLead.id, form);
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
    if (!selectedLead) return;
    setSaving(true);
    setFormError(null);
    try {
      await remove(selectedLead.id);
      closeModal();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDrag(leadId: string, newStatus: LeadStatus) {
    try {
      await updateLeadStatus(leadId, newStatus);
    } catch {
      // Optimistic update already rolled back by the hook
    }
  }

  const leadsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.status === stage);
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("admissions.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{leads.length} {t("admissions.totalLeads")}</p>
        </div>
        <Button onClick={openCreate}>{t("admissions.addLead")}</Button>
      </div>

      {isLoading && <div className="text-slate-500">{t("common.loading")}</div>}
      {error && <div className="text-red-600">{t("common.error")}: {error}</div>}

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <div key={stage} className="flex-shrink-0 w-72">
            <div className={`rounded-t-lg border-b-2 px-3 py-2 ${STAGE_COLORS[stage].replace("bg-", "border-").replace("-50", "-400")}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{STAGE_LABELS[stage]}</span>
                <span className="text-xs font-bold text-slate-500">{leadsByStage[stage].length}</span>
              </div>
            </div>
            <div className={`rounded-b-lg border border-t-0 ${STAGE_COLORS[stage]} p-2 space-y-2 min-h-[200px]`}>
              {leadsByStage[stage].map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragEnd={(e) => {
                    // Find which column we're over after drag
                    const target = e.currentTarget as HTMLElement;
                    // Extract the target stage from the DOM column structure
                    const stageHeader = target.closest(".min-h-\\[200px\\]")?.previousElementSibling;
                    // Simple: do nothing on drag end, rely on drop
                  }}
                  onClick={() => openEdit(lead)}
                  className="bg-white rounded border border-slate-200 p-3 cursor-pointer hover:shadow-md transition-shadow text-sm"
                >
                  <div className="font-medium text-slate-900">{lead.first_name} {lead.last_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{lead.email}</div>
                  {lead.source_campaign && (
                    <div className="text-xs text-slate-400 mt-1">{lead.source_campaign}</div>
                  )}
                </div>
              ))}
              {leadsByStage[stage].length === 0 && (
                <div className="text-xs text-slate-400 text-center py-4">—</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modal !== null && !confirmDelete}
        onClose={closeModal}
        title={modal === "create" ? t("admissions.addLead") : t("admissions.editLead")}
        footer={
          <>
            {modal === "edit" && (
              <Button
                variant="danger"
                onClick={() => setConfirmDelete(true)}
                className="mr-auto"
              >
                {t("admissions.deleteLead")}
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
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("leads.form.firstName")}>
              <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required />
            </FormField>
            <FormField label={t("leads.form.lastName")}>
              <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required />
            </FormField>
          </div>
          <FormField label={t("leads.form.email")}>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("leads.form.phone")}>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </FormField>
            <FormField label={t("leads.form.sourceCampaign")}>
              <Input value={form.source_campaign} onChange={(e) => set("source_campaign", e.target.value)} placeholder={t("leads.form.sourceCampaignPlaceholder")} />
            </FormField>
          </div>
          <FormField label={t("leads.form.notes")}>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder={t("leads.form.notesPlaceholder")}
            />
          </FormField>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={confirmDelete}
        onClose={closeModal}
        title={t("admissions.deleteLead")}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>{t("common.cancel")}</Button>
            <Button variant="danger" onClick={handleDelete} loading={saving}>{t("admissions.deleteLead")}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          {t("admissions.confirmDelete", { name: selectedLead ? `${selectedLead.first_name} ${selectedLead.last_name}` : "" })}
        </p>
      </Modal>
    </div>
  );
}
