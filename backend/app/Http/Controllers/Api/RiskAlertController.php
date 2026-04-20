<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RiskAlert;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RiskAlertController extends Controller
{
    /**
     * GET /api/risk-alerts?status=pending|reviewed|resolved
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'reviewed', 'resolved', 'escalated'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = RiskAlert::query()
            ->with(['student:id,first_name,last_name,grade_level'])
            ->orderBy('created_at', 'desc');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $perPage = (int) $request->query('per_page', 20);
        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
            ],
        ]);
    }

    /**
     * POST /api/risk-alerts
     * Body: { student_id, attendance_rate, grade_drop_percentage, risk_factors: string[], notes? }
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id' => ['required', 'uuid', 'exists:students,id'],
            'attendance_rate' => ['required', 'numeric', 'min:0', 'max:1'],
            'grade_drop_percentage' => ['required', 'numeric', 'min:0', 'max:1'],
            'risk_factors' => ['required', 'array', 'min:1'],
            'risk_factors.*' => [Rule::in(['low_attendance', 'grade_decline'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $data['counselor_id'] = $request->user()->id;
        $data['status'] = RiskAlert::STATUS_PENDING;

        $alert = RiskAlert::create($data);
        $alert->load('student:id,first_name,last_name,grade_level');

        return response()->json(['data' => $alert], 201);
    }

    /**
     * GET /api/students/{student}/risk-alerts
     */
    public function getStudentRiskAlerts(Student $student): JsonResponse
    {
        $alerts = $student->riskAlerts()
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $alerts]);
    }

    /**
     * PATCH /api/risk-alerts/{riskAlert}
     * Body: {status?, notes?}
     */
    public function update(Request $request, RiskAlert $riskAlert): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'reviewed', 'resolved', 'escalated'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $riskAlert->fill($data)->save();
        $riskAlert->load('student:id,first_name,last_name,grade_level');

        return response()->json(['data' => $riskAlert]);
    }
}