<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreIncidentRequest;
use App\Http\Requests\ResolveIncidentRequest;
use App\Models\Incident;
use App\Models\Student;
use App\Models\User;
use App\Notifications\IncidentGuardianNotification;
use App\Notifications\IncidentReported;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class IncidentController extends Controller
{
    /**
     * GET /api/incidents
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Incident::class);

        $query = Incident::query()
            ->with('student:id,first_name,last_name,grade_level');

        // Status filter: open (no resolved_at) or resolved
        if ($request->status === 'open') {
            $query->whereNull('resolved_at');
        } elseif ($request->status === 'resolved') {
            $query->whereNotNull('resolved_at');
        }

        if ($request->severity) {
            $query->where('severity', $request->severity);
        }

        if ($request->type) {
            $query->where('type', $request->type);
        }

        if ($request->student_id) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->date_from) {
            $query->whereDate('occurred_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('occurred_at', '<=', $request->date_to);
        }

        $incidents = $query->orderByDesc('occurred_at')->paginate(20);

        $data = collect($incidents->items())->map(function ($incident) {
            return [
                'id' => $incident->id,
                'student_id' => $incident->student_id,
                'student_name' => $incident->student ? "{$incident->student->first_name} {$incident->student->last_name}" : null,
                'grade_level' => $incident->student?->grade_level,
                'type' => $incident->type,
                'severity' => $incident->severity,
                'description' => $incident->description,
                'occurred_at' => $incident->occurred_at?->toIsoString(),
                'resolved_at' => $incident->resolved_at?->toIsoString(),
                'reported_by_user_id' => $incident->reported_by_user_id,
                'resolution_notes' => $incident->resolution_notes,
                'notify_coordinator' => $incident->notify_coordinator,
                'is_resolved' => $incident->resolved_at !== null,
                'created_at' => $incident->created_at?->toIsoString(),
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $incidents->currentPage(),
                'last_page' => $incidents->lastPage(),
                'per_page' => $incidents->perPage(),
                'total' => $incidents->total(),
            ],
        ]);
    }

    /**
     * GET /api/incidents/{id}
     */
    public function show(Incident $incident): JsonResponse
    {
        $this->authorize('view', $incident);

        $incident->load([
            'student:id,first_name,last_name,grade_level',
            'reporter:id,name',
            'resolver:id,name',
        ]);

        return response()->json([
            'data' => [
                'id' => $incident->id,
                'student_id' => $incident->student_id,
                'student_name' => $incident->student ? "{$incident->student->first_name} {$incident->student->last_name}" : null,
                'grade_level' => $incident->student?->grade_level,
                'type' => $incident->type,
                'severity' => $incident->severity,
                'description' => $incident->description,
                'occurred_at' => $incident->occurred_at?->toIsoString(),
                'resolved_at' => $incident->resolved_at?->toIsoString(),
                'reporter_name' => $incident->reporter?->name,
                'resolver_name' => $incident->resolver?->name,
                'resolution_notes' => $incident->resolution_notes,
                'notify_coordinator' => $incident->notify_coordinator,
                'is_resolved' => $incident->resolved_at !== null,
                'created_at' => $incident->created_at?->toIsoString(),
            ],
        ]);
    }

    /**
     * POST /api/incidents
     */
    public function store(StoreIncidentRequest $request): JsonResponse
    {
        $this->authorize('create', Incident::class);

        $user = $request->user();

        $incident = Incident::create([
            'student_id' => $request->student_id,
            'reported_by_user_id' => $user->id,
            'type' => $request->type,
            'severity' => $request->severity,
            'description' => $request->description,
            'occurred_at' => $request->occurred_at,
            'notify_coordinator' => $request->boolean('notify_coordinator', true),
        ]);

        $incident->load([
            'student:id,first_name,last_name,grade_level',
            'reporter:id,name',
        ]);

        // Dispatch notification if high priority
        $shouldNotify = $incident->type === Incident::TYPE_MEDICAL
            || ($incident->severity === Incident::SEVERITY_HIGH && $incident->notify_coordinator);

        if ($shouldNotify) {
            $coordinators = User::whereIn('role', [User::ROLE_ADMIN, User::ROLE_DIRECTOR, User::ROLE_COORDINATOR])->get();
            $studentName = $incident->student ? "{$incident->student->first_name} {$incident->student->last_name}" : 'Unknown';
            Notification::send($coordinators, new IncidentReported($incident, $studentName, $user->name));
        }

        // Notify guardians of the student (non-blocking — log failures but don't fail the request)
        try {
            $this->notifyGuardians($incident);
        } catch (\Throwable $e) {
            Log::error('Guardian notification failed for incident ' . $incident->id . ': ' . $e->getMessage());
        }

        return response()->json([
            'data' => [
                'id' => $incident->id,
                'student_id' => $incident->student_id,
                'student_name' => $incident->student ? "{$incident->student->first_name} {$incident->student->last_name}" : null,
                'type' => $incident->type,
                'severity' => $incident->severity,
                'description' => $incident->description,
                'occurred_at' => $incident->occurred_at?->toIsoString(),
                'notify_coordinator' => $incident->notify_coordinator,
                'created_at' => $incident->created_at?->toIsoString(),
            ],
        ], 201);
    }

    /**
     * Notify all guardians of the student about the incident.
     */
    private function notifyGuardians(Incident $incident): void
    {
        if (!$incident->student) {
            return;
        }

        $guardians = $incident->student->guardians;
        foreach ($guardians as $guardian) {
            Notification::send($guardian, new IncidentGuardianNotification($incident, $guardian));
        }
    }

    /**
     * PATCH /api/incidents/{id}/resolve
     */
    public function resolve(ResolveIncidentRequest $request, Incident $incident): JsonResponse
    {
        $this->authorize('resolve', $incident);

        $user = $request->user();

        $incident->update([
            'resolved_at' => $request->resolved_at,
            'resolved_by_user_id' => $user->id,
            'resolution_notes' => $request->resolution_notes,
        ]);

        $incident->load([
            'student:id,first_name,last_name,grade_level',
            'reporter:id,name',
            'resolver:id,name',
        ]);

        // Notify guardians of resolution (non-blocking)
        try {
            $this->notifyGuardians($incident);
        } catch (\Throwable $e) {
            Log::error('Guardian notification failed for incident ' . $incident->id . ': ' . $e->getMessage());
        }

        return response()->json([
            'data' => [
                'id' => $incident->id,
                'resolved_at' => $incident->resolved_at?->toIsoString(),
                'resolved_by_user_id' => $incident->resolved_by_user_id,
                'resolver_name' => $incident->resolver?->name,
                'resolution_notes' => $incident->resolution_notes,
                'is_resolved' => true,
            ],
        ]);
    }

    /**
     * GET /api/guardian/children/{student}/incidents
     * Guardian view — only their linked students' incidents.
     */
    public function guardianStudentIncidents(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        $isLinked = $guardian->students()->where('student_id', $student->id)->exists();
        if (!$isLinked) {
            return response()->json([
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => 'You are not linked to this student.',
                ],
            ], 403);
        }

        $incidents = Incident::where('student_id', $student->id)
            ->orderByDesc('occurred_at')
            ->get()
            ->map(fn ($i) => [
                'id' => $i->id,
                'type' => $i->type,
                'severity' => $i->severity,
                'description' => $i->description,
                'occurred_at' => $i->occurred_at?->toIsoString(),
                'resolved_at' => $i->resolved_at?->toIsoString(),
                'is_resolved' => $i->isResolved(),
                'resolution_notes' => $i->resolution_notes,
            ]);

        return response()->json(['data' => $incidents]);
    }
}