<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EnrollmentLead;
use App\Models\RiskAlert;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $leadsTotal = EnrollmentLead::count();
        $leadsByStage = EnrollmentLead::query()
            ->selectRaw("status, count(*) as count")
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $leadsActive = EnrollmentLead::whereNotIn('status', ['enrolled', 'lost'])->count();

        $studentsTotal = Student::count();
        $studentsEnrolled = Student::where('enrollment_status', 'enrolled')->count();

        $sectionsTotal = Section::count();

        $riskAlertsPending = RiskAlert::where('status', 'pending')->count();
        $riskAlertsTotal = RiskAlert::count();

        // Map stage names to match frontend LeadStatus type
        $stageMapping = [
            'inquiry' => 'inquiry',
            'tour_scheduled' => 'tour_scheduled',
            'application_sent' => 'application_sent',
            'enrolled' => 'enrolled',
            'lost' => 'lost',
        ];

        $leadsByStageNormalized = [];
        foreach ($stageMapping as $dbStatus => $frontendStatus) {
            $leadsByStageNormalized[$frontendStatus] = $leadsByStage[$dbStatus] ?? 0;
        }

        return response()->json([
            'data' => [
                'leads_total' => $leadsTotal,
                'leads_by_stage' => $leadsByStageNormalized,
                'leads_active' => $leadsActive,
                'students_total' => $studentsTotal,
                'students_enrolled' => $studentsEnrolled,
                'sections_total' => $sectionsTotal,
                'risk_alerts_pending' => $riskAlertsPending,
                'risk_alerts_total' => $riskAlertsTotal,
                'broadcasts_sent' => 0,
            ],
        ]);
    }
}