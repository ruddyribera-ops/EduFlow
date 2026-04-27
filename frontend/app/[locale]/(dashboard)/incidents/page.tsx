"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useIncidents, type Incident, type IncidentType, type IncidentSeverity } from "@/hooks/useIncidents";
import { useSections } from "@/hooks/useSections";
import type { Section } from "@/types";

const TYPE_COLORS: Record<IncidentType, string> = {
  medical: "bg-blue-100 text-blue-700",
  behavioral: "bg-purple-100 text-purple-700",
  late_arrival: "bg-amber-100 text-amber-700",
  early_dismissal: "bg-orange-100 text-orange-700",
  visitor: "bg-slate-100 text-slate-600",
  other: "bg-slate-100 text-slate-600",
};

const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

const TYPE_OPTIONS: Array<{ value: IncidentType; label: string }> = [
  { value: "medical", label: "Medical" },
  { value: "behavioral", label: "Behavioral" },
  { value: "late_arrival", label: "Late Arrival" },
  { value: "early_dismissal", label: "Early Dismissal" },
  { value: "visitor", label: "Visitor" },
  { value: "other", label: "Other" },
];

const SEVERITY_OPTIONS: Array<{ value: IncidentSeverity; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

interface ReportForm {
  student_id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  occurred_at: string;
  notify_coordinator: boolean;
}

const emptyForm: ReportForm = {
  student_id: "",
  type: "other",
  severity: "medium",
  description: "",
  occurred_at: new Date().toISOString().slice(0, 16),
  notify_coordinator: true,
};

interface ResolveForm {
  resolved_at: string;
  resolution_notes: string;
}

export default function IncidentsPage() {
  const t = useTranslations("incidents");
  const tCommon = useTranslations("common");

  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "">("");
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | "">("");
  const [typeFilter, setTypeFilter] = useState<IncidentType | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchName, setSearchName] = useState("");

  const [showReportModal, setShowReportModal] = useState(false);
  const [form, setForm] = useState<ReportForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveForm, setResolveForm] = useState<ResolveForm>({
    resolved_at: new Date().toISOString().slice(0, 16),
    resolution_notes: "",
  });
  const [resolving, setResolving] = useState(false);

  const { incidents, isLoading, create, resolve } = useIncidents({
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    type: typeFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const { sections } = useSections();

  // Get enrolled students from sections
  interface StudentOption { id: string; name: string; grade_level: string }
  const enrolledStudents = useMemo(() => {
    const studentMap = new Map<string, StudentOption>();
    sections.forEach((s: Section) => {
      s.students?.forEach((st) => {
        const student: StudentOption = { id: st.id, name: `${st.first_name} ${st.last_name}`, grade_level: st.grade_level };
        if (!studentMap.has(st.id)) {
          studentMap.set(st.id, student);
        }
      });
    });
    return Array.from(studentMap.values());
  }, [sections]);

  const filtered = useMemo(() => {
    if (!searchName) return incidents;
    const lower = searchName.toLowerCase();
    return incidents.filter((i) =>
      i.student_name?.toLowerCase().includes(lower)
    );
  }, [incidents, searchName]);

  // Stats
  const stats = useMemo(() => {
    const open = incidents.filter((i) => !i.is_resolved);
    return {
      totalOpen: open.length,
      medical: open.filter((i) => i.type === "medical").length,
      behavioral: open.filter((i) => i.type === "behavioral").length,
      late_arrival: open.filter((i) => i.type === "late_arrival").length,
      early_dismissal: open.filter((i) => i.type === "early_dismissal").length,
      visitor: open.filter((i) => i.type === "visitor").length,
      other: open.filter((i) => i.type === "other").length,
    };
  }, [incidents]);

  function setField<K extends keyof ReportForm>(key: K, value: ReportForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleReport() {
    if (!form.student_id || !form.occurred_at) {
      setFormError(t("fillAllFields"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await create({
        student_id: form.student_id,
        type: form.type,
        severity: form.severity,
        description: form.description || undefined,
        occurred_at: form.occurred_at,
        notify_coordinator: form.notify_coordinator,
      });
      setShowReportModal(false);
      setForm(emptyForm);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error creating incident");
    } finally {
      setSaving(false);
    }
  }

  async function handleResolve() {
    if (!selectedIncident) return;
    setResolving(true);
    try {
      await resolve(selectedIncident.id, {
        resolved_at: resolveForm.resolved_at,
        resolution_notes: resolveForm.resolution_notes || undefined,
      });
      setShowResolveModal(false);
      setSelectedIncident(null);
      setResolveForm({ resolved_at: new Date().toISOString().slice(0, 16), resolution_notes: "" });
    } catch (err) {
      // handle error
    } finally {
      setResolving(false);
    }
  }

  function openResolve(incident: Incident) {
    setSelectedIncident(incident);
    setShowResolveModal(true);
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} incidents</p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          {t("report")}
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-900">{stats.totalOpen}</div>
          <div className="text-xs text-slate-500">Open Incidents</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.medical}</div>
          <div className="text-xs text-slate-500">Medical</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.behavioral}</div>
          <div className="text-xs text-slate-500">Behavioral</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.late_arrival}</div>
          <div className="text-xs text-slate-500">Late Arrival</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-lg p-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | "open" | "resolved")}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Severity</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as IncidentSeverity)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as IncidentType)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Search student</label>
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Student name..."
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        {(statusFilter || severityFilter || typeFilter || dateFrom || dateTo || searchName) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setSeverityFilter("");
              setTypeFilter("");
              setDateFrom("");
              setDateTo("");
              setSearchName("");
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
          {t("noIncidents")}
        </div>
      )}

      {/* Incidents list */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">Student</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">Type</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">Severity</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">Occurred</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">Reported by</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident) => (
                <tr
                  key={incident.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                  onClick={() => setSelectedIncident(incident)}
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-900">{incident.student_name ?? "Unknown"}</div>
                    <div className="text-xs text-slate-500">{incident.grade_level ?? ""}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[incident.type]}`}>
                      {incident.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[incident.severity]}`}>
                      {incident.severity}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs">
                    {incident.occurred_at ? new Date(incident.occurred_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {incident.is_resolved ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Resolved</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">Open</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs">{incident.reporter_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    {!incident.is_resolved && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openResolve(incident); }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {t("resolve")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Report Incident Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{t("report")}</h2>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {formError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{formError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("student")}</label>
                <select
                  value={form.student_id}
                  onChange={(e) => setField("student_id", e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">-- {t("selectStudent")} --</option>
                  {enrolledStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.grade_level})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("type")}</label>
                  <select
                    value={form.type}
                    onChange={(e) => setField("type", e.target.value as IncidentType)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t("severity")}</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setField("severity", e.target.value as IncidentSeverity)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  >
                    {SEVERITY_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("description")}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  placeholder={t("descriptionPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("occurredAt")}</label>
                <input
                  type="datetime-local"
                  value={form.occurred_at}
                  onChange={(e) => setField("occurred_at", e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.notify_coordinator}
                  onChange={(e) => setField("notify_coordinator", e.target.checked)}
                  className="rounded"
                />
                {t("notifyCoordinator")}
              </label>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleReport}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? tCommon("loading") : t("report")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Detail Sidebar / Modal */}
      {selectedIncident && !showResolveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Incident Detail</h2>
              <button onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Student</div>
                  <div className="font-medium">{selectedIncident.student_name ?? "Unknown"}</div>
                  <div className="text-xs text-slate-500">{selectedIncident.grade_level}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Type</div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[selectedIncident.type]}`}>
                    {selectedIncident.type.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Severity</div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[selectedIncident.severity]}`}>
                    {selectedIncident.severity}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Status</div>
                  {selectedIncident.is_resolved ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Resolved</span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">Open</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Description</div>
                <div className="text-slate-700">{selectedIncident.description ?? "No description"}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Occurred at</div>
                  <div className="text-slate-700">
                    {selectedIncident.occurred_at ? new Date(selectedIncident.occurred_at).toLocaleString() : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Reported by</div>
                  <div className="text-slate-700">{selectedIncident.reporter_name ?? "—"}</div>
                </div>
              </div>
              {selectedIncident.is_resolved && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-500">Resolved at</div>
                      <div className="text-slate-700">
                        {selectedIncident.resolved_at ? new Date(selectedIncident.resolved_at).toLocaleString() : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Resolved by</div>
                      <div className="text-slate-700">{selectedIncident.resolver_name ?? "—"}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Resolution notes</div>
                    <div className="text-slate-700">{selectedIncident.resolution_notes ?? "—"}</div>
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                {tCommon("close")}
              </button>
              {!selectedIncident.is_resolved && (
                <button
                  onClick={() => openResolve(selectedIncident)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  {t("resolve")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedIncident && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{t("resolve")} Incident</h2>
              <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Resolved at</label>
                <input
                  type="datetime-local"
                  value={resolveForm.resolved_at}
                  onChange={(e) => setResolveForm((f) => ({ ...f, resolved_at: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Resolution notes</label>
                <textarea
                  value={resolveForm.resolution_notes}
                  onChange={(e) => setResolveForm((f) => ({ ...f, resolution_notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  placeholder={t("resolutionNotesPlaceholder")}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
              >
                {resolving ? tCommon("loading") : t("markResolved")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}