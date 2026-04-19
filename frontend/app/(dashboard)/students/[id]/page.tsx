"use client";

import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { swrFetcher } from "@/lib/api";
import type { ApiResource, Student, CommunicationPreference } from "@/types";

const PREF_LABEL: Record<CommunicationPreference, string> = {
  email_only: "Email only",
  sms_only: "SMS only",
  both: "Email + SMS",
};

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, isLoading } = useSWR<ApiResource<Student>>(
    params.id ? `/students/${params.id}` : null,
    swrFetcher
  );

  if (isLoading) return <div className="p-6 text-slate-500">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;
  if (!data) return null;

  const s = data.data;

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <Link href="/students" className="text-sm text-slate-500 hover:text-slate-900">← Back to students</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">{s.first_name} {s.last_name}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {s.grade_level} · <span className="capitalize">{s.enrollment_status}</span>
          {s.date_of_birth && ` · Born ${new Date(s.date_of_birth).toLocaleDateString()}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Section</h2>
          {s.section ? (
            <div>
              <div className="font-medium text-slate-900">{s.section.name}</div>
              <div className="text-sm text-slate-600 mt-1">
                Grade {s.section.grade_level}
                {s.section.room && ` · Room ${s.section.room}`}
              </div>
              {s.section.teacher && (
                <div className="text-sm text-slate-600 mt-2">
                  Teacher: <span className="text-slate-900">{s.section.teacher.name}</span>
                </div>
              )}
              {s.section.counselor && (
                <div className="text-sm text-slate-600">
                  Counselor: <span className="text-slate-900">{s.section.counselor.name}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-500">Not assigned to a section.</div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Guardians ({s.guardians?.length ?? 0})</h2>
          {s.guardians && s.guardians.length > 0 ? (
            <div className="space-y-3">
              {s.guardians.map((g) => (
                <div key={g.id} className="text-sm border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                  <div className="font-medium text-slate-900">
                    {g.first_name} {g.last_name}
                    {g.relationship_type && (
                      <span className="ml-2 text-xs font-normal text-slate-500">({g.relationship_type})</span>
                    )}
                  </div>
                  <div className="text-slate-600 mt-0.5">{g.email}</div>
                  {g.phone && <div className="text-slate-600">{g.phone}</div>}
                  <div className="text-xs text-slate-500 mt-1">
                    Contact: {PREF_LABEL[g.communication_preference]}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">No guardians registered.</div>
          )}
        </div>
      </div>
    </div>
  );
}
