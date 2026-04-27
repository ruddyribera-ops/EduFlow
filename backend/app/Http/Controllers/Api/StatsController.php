<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\EnrollmentLead;
use App\Models\Incident;
use App\Models\ParentMeeting;
use App\Models\RiskAlert;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    /**
     * Full dashboard snapshot — all KPIs in one efficient response.
     */
    public function dashboard(): JsonResponse
    {
        // ── Leads ──────────────────────────────────────────────────────────
        $leadsTotal = EnrollmentLead::count();
        $leadsByStageRaw = EnrollmentLead::selectRaw("status, count(*) as count")
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $stageMapping = ['inquiry', 'tour_scheduled', 'application_sent', 'enrolled', 'lost'];
        $leadsByStage = [];
        foreach ($stageMapping as $s) {
            $leadsByStage[$s] = $leadsByStageRaw[$s] ?? 0;
        }

        $leadsActive = EnrollmentLead::whereNotIn('status', ['enrolled', 'lost'])->count();

        // ── Students ───────────────────────────────────────────────────────
        $studentsTotal = Student::count();
        $studentsEnrolled = Student::where('enrollment_status', 'enrolled')->count();

        // ── Sections ───────────────────────────────────────────────────────
        $sectionsTotal = Section::count();

        // ── Risk Alerts ─────────────────────────────────────────────────────
        $riskAlertsPending = RiskAlert::where('status', 'pending')->count();
        $riskAlertsTotal = RiskAlert::count();
        $riskByStatusRaw = RiskAlert::selectRaw("status, count(*) as count")
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();
        $riskByStatus = [];
        foreach (['pending', 'reviewed', 'resolved'] as $s) {
            $riskByStatus[$s] = $riskByStatusRaw[$s] ?? 0;
        }

        // ── Attendance Today ────────────────────────────────────────────────
        $today = now()->toDateString();
        $attendanceRaw = Attendance::where('date', $today)
            ->selectRaw("status, count(*) as count")
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $present  = (int) ($attendanceRaw['present'] ?? 0);
        $absent   = (int) ($attendanceRaw['absent'] ?? 0);
        $tardy    = (int) ($attendanceRaw['tardy'] ?? 0);
        $excused  = (int) ($attendanceRaw['excused'] ?? 0);
        $attendanceTotal = $present + $absent + $tardy + $excused;
        $presentRate = $attendanceTotal > 0
            ? round($present / $attendanceTotal * 100, 1)
            : 0;

        // ── Incidents This Week ─────────────────────────────────────────────
        $weekAgo = now()->subDays(7);
        $incidentsWeek = Incident::where('occurred_at', '>=', $weekAgo)->count();
        $incidentsOpen = Incident::whereNull('resolved_at')->where('occurred_at', '>=', $weekAgo)->count();

        // ── Grade Summary ───────────────────────────────────────────────────
        $gradeStats = DB::select("
            SELECT
                COUNT(*) as total,
                AVG(score / NULLIF(max_score, 0) * 100) as avg_percentage,
                SUM(CASE WHEN (score / NULLIF(max_score, 0) * 100) < 60 THEN 1 ELSE 0 END) as failing_count
            FROM grades
        ");
        $gradeStats = $gradeStats[0] ?? (object) ['total' => 0, 'avg_percentage' => null, 'failing_count' => 0];

        // ── Enrollment by Month (current year) ─────────────────────────────
        $monthlyRaw = Student::selectRaw("EXTRACT(MONTH FROM created_at) as month, COUNT(*) as count")
            ->whereRaw("EXTRACT(YEAR FROM created_at) = ?", [now()->year])
            ->groupByRaw("EXTRACT(MONTH FROM created_at)")
            ->orderByRaw("EXTRACT(MONTH FROM created_at)")
            ->pluck('count', 'month')
            ->toArray();

        $enrollmentByMonth = array_fill(1, 12, 0);
        foreach ($monthlyRaw as $m => $c) { $enrollmentByMonth[(int) $m] = (int) $c; }
        $enrollmentByMonth = array_values($enrollmentByMonth); // 12-entry array

        // ── Section Attendance This Week ───────────────────────────────────
        $weekStart = now()->startOfWeek()->toDateString();
        $weekEnd   = now()->endOfWeek()->toDateString();
        $sectionStats = DB::select("
            SELECT s.id, s.name, s.grade_level,
                COUNT(DISTINCT ss.student_id) as total_students,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status IN ('absent','tardy','excused') THEN 1 ELSE 0 END) as absent_count
            FROM sections s
            LEFT JOIN section_student ss ON ss.section_id = s.id
            LEFT JOIN attendances a ON a.section_id = s.id AND a.date >= ? AND a.date <= ?
            GROUP BY s.id, s.name, s.grade_level
            ORDER BY s.grade_level, s.name
        ", [$weekStart, $weekEnd]);

        $sectionAttendance = array_map(function ($row) {
            $present  = (int) $row->present_count;
            $absent   = (int) $row->absent_count;
            $total    = $present + $absent;
            $rate     = $total > 0 ? round($present / $total * 100, 1) : 0;
            return [
                'name'             => $row->name,
                'grade_level'     => $row->grade_level,
                'total_students'  => (int) $row->total_students,
                'present'         => $present,
                'absent'          => $absent,
                'attendance_rate' => $rate,
            ];
        }, $sectionStats);

        // ── Upcoming Parent Meetings (next 7 days) ──────────────────────────
        $upcomingMeetings = ParentMeeting::with('student:id,first_name,last_name')
            ->whereBetween('meeting_date', [$today, now()->addDays(7)->toDateString()])
            ->orderBy('meeting_date')
            ->limit(10)
            ->get()
            ->map(fn($m) => [
                'id'           => $m->id,
                'student_name' => $m->student ? "{$m->student->first_name} {$m->student->last_name}" : null,
                'meeting_date' => $m->meeting_date?->toDateString(),
                'day_time'     => $m->day_time,
                'modality'     => $m->modality,
                'confirmation' => $m->confirmation,
            ]);

        return response()->json([
            'data' => [
                // Leads
                'leads_total'       => $leadsTotal,
                'leads_by_stage'    => $leadsByStage,
                'leads_active'      => $leadsActive,
                // Students
                'students_total'    => $studentsTotal,
                'students_enrolled' => $studentsEnrolled,
                // Sections
                'sections_total'    => $sectionsTotal,
                // Risk
                'risk_alerts_pending' => $riskAlertsPending,
                'risk_alerts_total'   => $riskAlertsTotal,
                'risk_by_status'      => $riskByStatus,
                // Attendance today
                'attendance_today' => [
                    'total'       => $attendanceTotal,
                    'present'     => $present,
                    'absent'      => $absent,
                    'tardy'       => $tardy,
                    'excused'     => $excused,
                    'present_rate'=> $presentRate,
                ],
                // Incidents
                'incidents_this_week' => [
                    'total' => $incidentsWeek,
                    'open'  => $incidentsOpen,
                ],
                // Grades
                'grade_summary' => [
                    'total_records'   => (int) $gradeStats->total,
                    'avg_percentage' => $gradeStats->avg_percentage !== null
                        ? round((float) $gradeStats->avg_percentage, 1)
                        : null,
                    'failing_count'   => (int) $gradeStats->failing_count,
                ],
                // Enrollment by month
                'enrollment_by_month' => $enrollmentByMonth,
                // Section attendance
                'section_attendance' => $sectionAttendance,
                // Meetings
                'upcoming_meetings'  => $upcomingMeetings,
                // Broadcasts (placeholder)
                'broadcasts_sent'    => 0,
            ],
        ]);
    }

    /**
     * Monthly enrollment counts for the current year — 12-entry array.
     * Used by the enrollment trend line/bar chart.
     */
    public function enrollmentOverTime(): JsonResponse
    {
        $counts = Student::selectRaw("EXTRACT(MONTH FROM created_at) as month, COUNT(*) as count")
            ->whereRaw("EXTRACT(YEAR FROM created_at) = ?", [now()->year])
            ->groupByRaw("EXTRACT(MONTH FROM created_at)")
            ->orderByRaw("EXTRACT(MONTH FROM created_at)")
            ->pluck('count', 'month')
            ->toArray();

        $byMonth = array_fill(1, 12, 0);
        foreach ($counts as $m => $c) { $byMonth[(int) $m] = (int) $c; }

        return response()->json(['data' => array_values($byMonth)]);
    }

    /**
     * Daily attendance present-rate for the last 30 days.
     * Used by the attendance trend line chart.
     */
    public function attendanceTrend(): JsonResponse
    {
        $start = now()->subDays(29)->startOfDay()->toDateString();

        $rows = DB::select("
            SELECT date,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::float
                    / NULLIF(COUNT(*), 0) * 100 as rate
            FROM attendances
            WHERE date >= ?
            GROUP BY date
            ORDER BY date
        ", [$start]);

        $data = array_map(fn($r) => [
            'date' => $r->date,
            'rate' => $r->rate !== null ? round((float) $r->rate, 1) : null,
        ], $rows);

        return response()->json(['data' => $data]);
    }

    /**
     * Daily incident count for the last 30 days.
     * Used by the incident trend bar chart.
     */
    public function incidentTrend(): JsonResponse
    {
        $start = now()->subDays(29)->startOfDay();

        $rows = Incident::selectRaw("DATE(occurred_at) as date, COUNT(*) as count")
            ->where('occurred_at', '>=', $start)
            ->groupByRaw("DATE(occurred_at)")
            ->orderByRaw("DATE(occurred_at)")
            ->pluck('count', 'date')
            ->toArray();

        return response()->json(['data' => $rows]);
    }
}
