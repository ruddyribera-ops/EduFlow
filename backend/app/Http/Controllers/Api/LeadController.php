<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateLeadStatusRequest;
use App\Models\EnrollmentLead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = EnrollmentLead::query()
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->source_campaign, fn($q) => $q->where('source_campaign', $request->source_campaign))
            // Postgres-safe pipeline ordering (MySQL FIELD() is not available in Postgres)
            ->orderByRaw("
                CASE status
                    WHEN 'inquiry' THEN 1
                    WHEN 'tour_scheduled' THEN 2
                    WHEN 'application_sent' THEN 3
                    WHEN 'enrolled' THEN 4
                    WHEN 'lost' THEN 5
                    ELSE 6
                END
            ")
            ->orderBy('created_at', 'desc');

        $leads = $query->paginate($request->get('per_page', 25));

        return response()->json([
            'data' => $leads->items(),
            'meta' => [
                'current_page' => $leads->currentPage(),
                'last_page' => $leads->lastPage(),
                'per_page' => $leads->perPage(),
                'total' => $leads->total(),
            ],
        ]);
    }

    public function show(EnrollmentLead $lead): JsonResponse
    {
        return response()->json(['data' => $lead]);
    }

    public function updateStatus(UpdateLeadStatusRequest $request, EnrollmentLead $lead): JsonResponse
    {
        $oldStatus = $lead->status;
        $newStatus = $request->validated()['status'];

        $lead->update([
            'status' => $newStatus,
            'last_contacted_at' => now(),
            'enrolled_at' => $newStatus === 'enrolled' ? now() : $lead->enrolled_at,
        ]);

        return response()->json([
            'message' => 'Lead status updated successfully',
            'data' => [
                'id' => $lead->id,
                'old_status' => $oldStatus,
                'status' => $lead->status,
            ],
        ]);
    }
}