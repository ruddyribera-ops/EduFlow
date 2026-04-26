# Incident Notification — {{ $studentName }}

A new incident has been recorded involving your child.

---

## Student
**{{ $studentName }}**

## Incident Type
@if($incidentType === 'medical')
<span style="background:#dbeafe; color:#1d4ed8; padding:2px 8px; border-radius:4px; font-size:12px;">Medical</span>
@elseif($incidentType === 'behavioral')
<span style="background:#ede9fe; color:#6d28d9; padding:2px 8px; border-radius:4px; font-size:12px;">Behavioral</span>
@elseif($incidentType === 'late_arrival')
<span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:4px; font-size:12px;">Late Arrival</span>
@elseif($incidentType === 'early_dismissal')
<span style="background:#ffedd5; color:#c2410c; padding:2px 8px; border-radius:4px; font-size:12px;">Early Dismissal</span>
@elseif($incidentType === 'visitor')
<span style="background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:4px; font-size:12px;">Visitor</span>
@else
<span style="background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:4px; font-size:12px;">Other</span>
@endif

## Severity
@if($severity === 'high')
<span style="background:#fee2e2; color:#b91c1c; padding:2px 8px; border-radius:4px; font-size:12px;">High</span>
@elseif($severity === 'medium')
<span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:4px; font-size:12px;">Medium</span>
@else
<span style="background:#d1fae5; color:#047857; padding:2px 8px; border-radius:4px; font-size:12px;">Low</span>
@endif

---

| Field | Details |
|-------|---------|
| **Occurred at** | {{ $occurredAt }} |
| **Description** | {{ $description ?? 'No description provided' }} |
| **Status** | @if($isResolved)<span style="background:#d1fae5; color:#047857; padding:2px 8px; border-radius:4px; font-size:12px;">Resolved</span>@else<span style="background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:4px; font-size:12px;">Open</span>@endif |

@if($isResolved && $resolvedAt)
**Resolved at:** {{ $resolvedAt }}
@endif

---

[View Incident](#)

---
*This is an automated notification from EduFlow. Please do not reply to this email.*
