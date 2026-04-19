"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";
import type { Lead, LeadStatus } from "@/types";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/constants";

interface KanbanColumnProps {
  stage: LeadStatus;
  leads: Lead[];
}

export function KanbanColumn({ stage, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-h-[500px] rounded-lg border-2 ${STAGE_COLORS[stage]} ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="p-3 border-b border-inherit">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{STAGE_LABELS[stage]}</span>
          <span className="text-xs bg-background px-2 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
