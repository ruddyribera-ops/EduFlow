"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useLeads } from "@/hooks/useLeads";
import { KanbanColumn } from "@/components/admissions/KanbanColumn";
import type { Lead, LeadStatus } from "@/types";
import { PIPELINE_STAGES } from "@/lib/constants";

export default function AdmissionsDashboard() {
  const { leads, isLoading, error, updateLeadStatus } = useLeads();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const leadsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((lead) => lead.status === stage);
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeLead = leads.find((l) => l.id === active.id);
      if (!activeLead) return;

      let targetStage: LeadStatus;
      if ((PIPELINE_STAGES as readonly string[]).includes(over.id as string)) {
        targetStage = over.id as LeadStatus;
      } else {
        const overLead = leads.find((l) => l.id === over.id);
        if (!overLead) return;
        targetStage = overLead.status;
      }

      if (activeLead.status === targetStage) return;

      try {
        await updateLeadStatus(activeLead.id, targetStage);
      } catch {
        // rollback handled inside hook; surface toast here if added later
      }
    },
    [leads, updateLeadStatus]
  );

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  if (isLoading) return <div className="p-6">Loading admissions...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admissions Pipeline</h1>
        <div className="text-sm text-muted-foreground">
          {leads.length} total leads
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-5 gap-4 overflow-x-auto">
          {PIPELINE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              leads={leadsByStage[stage]}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="bg-card p-3 rounded-md border shadow-lg opacity-90">
              <div className="font-medium text-sm">
                {activeLead.first_name} {activeLead.last_name}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
