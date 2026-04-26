{{ $studentName }} has had a new incident reported.

**Type:** {{ $incident->type }}
**Severity:** {{ $incident->severity }}
**Description:** {{ $incident->description ?? 'No description provided.' }}
**Occurred at:** {{ $incident->occurred_at?->format('M d, Y \a\t h:i A') }}
**Reported by:** {{ $reporterName }}

[View Incident]({{ $url }})