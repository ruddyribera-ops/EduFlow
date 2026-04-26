<?php

namespace App\Notifications;

use App\Models\Incident;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class IncidentReported extends Notification
{
    use Queueable;

    public Incident $incident;
    public string $studentName;
    public string $reporterName;

    public function __construct(Incident $incident, string $studentName, string $reporterName)
    {
        $this->incident = $incident;
        $this->studentName = $studentName;
        $this->reporterName = $reporterName;
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $type = $this->incident->type;
        $severity = $this->incident->severity;

        return (new MailMessage)
            ->subject("🚨 Incident Report: {$this->studentName} - {$type} - {$severity}")
            ->markdown('mail.incident-reported', [
                'incident' => $this->incident,
                'studentName' => $this->studentName,
                'reporterName' => $this->reporterName,
                'url' => url("/incidents/{$this->incident->id}"),
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'incident_id' => $this->incident->id,
            'student_name' => $this->studentName,
            'type' => $this->incident->type,
            'severity' => $this->incident->severity,
            'occurred_at' => $this->incident->occurred_at?->toIsoString(),
        ];
    }
}