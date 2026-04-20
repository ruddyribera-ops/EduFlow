<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateLeadStatusRequest;
use App\Models\EnrollmentLead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    /**
     * GET /api/leads
     */
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

    /**
     * GET /api/leads/{lead}
     */
    public function show(EnrollmentLead $lead): JsonResponse
    {
        return response()->json(['data' => $lead]);
    }

    /**
     * POST /api/leads
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', EnrollmentLead::class);

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'source_campaign' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'assigned_counselor_id' => ['nullable', 'uuid', 'exists:users,id'],
        ]);

        $lead = EnrollmentLead::create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'source_campaign' => $data['source_campaign'] ?? null,
            'notes' => $data['notes'] ?? null,
            'assigned_counselor_id' => $data['assigned_counselor_id'] ?? null,
            'status' => 'inquiry',
        ]);

        return response()->json(['data' => $lead], 201);
    }

    /**
     * PATCH /api/leads/{lead}
     */
    public function update(Request $request, EnrollmentLead $lead): JsonResponse
    {
        $this->authorize('update', $lead);

        $data = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'source_campaign' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'assigned_counselor_id' => ['nullable', 'uuid', 'exists:users,id'],
        ]);

        $lead->update($data);

        return response()->json(['data' => $lead]);
    }

    /**
     * DELETE /api/leads/{lead}
     */
    public function destroy(EnrollmentLead $lead): JsonResponse
    {
        $this->authorize('delete', $lead);
        $lead->delete();
        return response()->json(['message' => 'Lead deleted.'], 200);
    }

    /**
     * PATCH /api/leads/{lead}/status
     * Status-only update via Kanban drag-drop.
     */
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