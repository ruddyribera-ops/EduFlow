<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RiskAlert;
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
