"use client";

import useSWR from "swr";
import { swrFetcher } from "@/lib/api";
import type { ApiListResponse, Section } from "@/types";

export default function SectionsPage() {
  const { data, error, isLoading } = useSWR<ApiListResponse<Section>>("/sections", swrFetcher);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sections</h1>
        <p className="text-sm text-slate-500 mt-1">{data?.meta.total ?? 0} sections</p>
      </div>

      {isLoading && <div className="text-slate-500">Loading…</div>}
      {error && <div className="text-red-600">Error: {error.message}</div>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data.map((sec) => (
            <div key={sec.id} className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{sec.name}</h3>
                  <div className="text-sm text-slate-500 mt-1">
                    Grade {sec.grade_level}
                    {sec.room && ` · Room ${sec.room}`}
                  </div>
                </div>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded capitalize">
                  {sec.semester}
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-sm">
                <div className="text-slate-600">
                  Students: <span className="text-slate-900 font-medium">{sec.students_count ?? 0}</span>
                </div>
                <div className="text-slate-600">
                  Teacher: <span className="text-slate-900">{sec.teacher?.name ?? "—"}</span>
                </div>
                <div className="text-slate-600">
                  Counselor: <span className="text-slate-900">{sec.counselor?.name ?? "—"}</span>
                </div>
              </div>
            </div>
          ))}
          {data.data.length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-8">No sections yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
