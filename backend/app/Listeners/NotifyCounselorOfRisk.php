<?php

namespace App\Listeners;

use App\Events\StudentAtRisk;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotifyCounselorOfRisk implements ShouldQueue
{
    public function handle(StudentAtRisk $event): void
    {
        $student = $event->student;
        $riskFactors = $event->riskFactors;
        $severity = $event->severity;

        // Get counselors to notify
        $counselors = User::where('role', User::ROLE_COUNSELOR)->get();

        foreach ($counselors as $counselor) {
            Log::info("Risk alert for student {$student->full_name} sent to counselor {$counselor->email}", [
                'student_id' => $student->id,
                'risk_factors' => $riskFactors,
                'severity' => $severity,
            ]);
        }
    }
}