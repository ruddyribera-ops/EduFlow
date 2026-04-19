"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@/types";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  lead: Lead;
  isDragging?: boolean;
}

export function KanbanCard({ lead, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-card p-3 rounded-md border shadow-sm cursor-grab active:cursor-grabbing",
        "hover:shadow-md transition-shadow",
        (isDragging || isSortableDragging) && "opacity-50 shadow-lg"
      )}
    >
      <div className="font-medium text-sm">
        {lead.first_name} {lead.last_name}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{lead.email}</div>

      {lead.source_campaign && (
        <div className="mt-2 inline-flex items-center px-2 py-0.5 bg-secondary rounded text-xs">
          {lead.source_campaign}
        </div>
      )}

      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>{lead.phone || "No phone"}</span>
      </div>
    </div>
  );
}