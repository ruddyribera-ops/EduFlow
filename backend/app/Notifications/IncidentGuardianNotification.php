<?php

namespace App\Notifications;

use App\Models\Guardian;
use App\Models\Incident;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class IncidentGuardianNotification extends Notification
{
    use Queueable;

    public Incident $incident;
    public Guardian $guardian;

    public function __construct(Incident $incident, Guardian $guardian)
    {
        $this->incident = $incident;
        $this->guardian = $guardian;
    }

    public function via(object $notifiable): array
    {
        $channels = [];

        if ($this->guardian->communication_preference->includesEmail()) {
            $channels[] = 'mail';
        }

        if ($this->guardian->communication_preference->includesSms()) {
            $channels[] = 'vonage';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $studentName = $this->incident->student
            ? "{$this->incident->student->first_name} {$this->incident->student->last_name}"
            : 'Unknown Student';

        $subject = "[EduFlow] Incident Report: {$studentName} - {$this->incident->type}";

        return (new MailMessage)
            ->subject($subject)
            ->markdown('mail.incident-guardian', [
                'guardian' => $this->guardian,
                'incident' => $this->incident,
                'studentName' => $studentName,
                'url' => url("/guardian/incidents/{$this->incident->id}"),
            ]);
    }

    public function toVonage(object $notifiable): \Illuminate\Notifications\Messages\VonageMessage
    {
        $studentName = $this->incident->student
            ? "{$this->incident->student->first_name} {$this->incident->student->last_name}"
            : 'Unknown Student';

        return (new \Illuminate\Notifications\Messages\VonageMessage)
            ->content("EduFlow: Incident report for {$studentName}. Type: {$this->incident->type}, Severity: {$this->incident->severity}. Contact school for details.");
    }

    public function toArray(object $notifiable): array
    {
        return [
            'incident_id' => $this->incident->id,
            'student_id' => $this->incident->student_id,
            'guardian_id' => $this->guardian->id,
            'type' => $this->incident->type,
            'severity' => $this->incident->severity,
        ];
    }
}