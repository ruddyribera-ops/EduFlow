<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ParentMeeting;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ParentMeetingController extends Controller
{
    private const VALID_MODALITIES = ['in_person', 'virtual', 'phone'];
    private const VALID_CONFIRMATIONS = ['pending', 'confirmed', 'cancelled'];

    /**
     * GET /api/parent-meetings?student_id=&date_from=&date_to=
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ParentMeeting::class);

        $request->validate([
            'student_id' => ['nullable', 'uuid', 'exists:students,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ]);

        $query = ParentMeeting::query()
            ->with('student:id,first_name,last_name,grade_level')
            ->with('creator:id,name');

        if ($request->student_id) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->date_from) {
            $query->whereDate('meeting_date', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('meeting_date', '<=', $request->date_to);
        }

        $meetings = $query->orderByDesc('meeting_date')->paginate(20);

        $data = collect($meetings->items())->map(fn ($meeting) => $this->transform($meeting));

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $meetings->currentPage(),
                'last_page' => $meetings->lastPage(),
                'per_page' => $meetings->perPage(),
                'total' => $meetings->total(),
            ],
        ]);
    }

    /**
     * GET /api/parent-meetings/{parentMeeting}
     */
    public function show(ParentMeeting $parentMeeting): JsonResponse
    {
        $this->authorize('view', $parentMeeting);

        $parentMeeting->load([
            'student:id,first_name,last_name,grade_level',
            'creator:id,name',
            'updater:id,name',
        ]);

        $parentMeeting->load(['student.guardians']);

        $guardianNames = $parentMeeting->student
            ? $parentMeeting->student->guardians->pluck('full_name')->toArray()
            : [];

        return response()->json([
            'data' => [
                'id' => $parentMeeting->id,
                'student_id' => $parentMeeting->student_id,
                'student_name' => $parentMeeting->student
                    ? "{$parentMeeting->student->first_name} {$parentMeeting->student->last_name}"
                    : null,
                'meeting_date' => $parentMeeting->meeting_date?->toDateString(),
                'tutor_name' => $parentMeeting->tutor_name,
                'day_time' => $parentMeeting->day_time,
                'attendees' => $parentMeeting->attendees_list,
                'guardian_names' => $guardianNames,
                'modality' => $parentMeeting->modality,
                'confirmation' => $parentMeeting->confirmation,
                'observation' => $parentMeeting->observation,
                'scheduled_date_and_time' => $parentMeeting->scheduled_date_and_time,
                'created_by_user_id' => $parentMeeting->created_by_user_id,
                'creator_name' => $parentMeeting->creator?->name,
                'updated_by_user_id' => $parentMeeting->updated_by_user_id,
                'updater_name' => $parentMeeting->updater?->name,
                'created_at' => $parentMeeting->created_at?->toIsoString(),
                'updated_at' => $parentMeeting->updated_at?->toIsoString(),
            ],
        ]);
    }

    /**
     * POST /api/parent-meetings
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', ParentMeeting::class);

        $data = $request->validate([
            'student_id' => ['required', 'uuid', 'exists:students,id'],
            'meeting_date' => ['required', 'date'],
            'tutor_name' => ['nullable', 'string', 'max:255'],
            'day_time' => ['nullable', 'string', 'max:100'],
            'attendees' => ['nullable', 'string', 'max:1000'],
            'modality' => ['nullable', Rule::in(self::VALID_MODALITIES)],
            'confirmation' => ['nullable', Rule::in(self::VALID_CONFIRMATIONS)],
            'observation' => ['nullable', 'string'],
        ]);

        $user = $request->user();

        $meeting = ParentMeeting::create([
            'student_id' => $data['student_id'],
            'meeting_date' => $data['meeting_date'],
            'tutor_name' => $data['tutor_name'] ?? null,
            'day_time' => $data['day_time'] ?? null,
            'attendees' => $data['attendees'] ?? null,
            'modality' => $data['modality'] ?? null,
            'confirmation' => $data['confirmation'] ?? 'pending',
            'observation' => $data['observation'] ?? null,
            'created_by_user_id' => $user->id,
            'updated_by_user_id' => $user->id,
        ]);

        $meeting->load(['student:id,first_name,last_name', 'creator:id,name']);

        return response()->json(['data' => $this->transform($meeting)], 201);
    }

    /**
     * PATCH /api/parent-meetings/{parentMeeting}
     */
    public function update(Request $request, ParentMeeting $parentMeeting): JsonResponse
    {
        $this->authorize('update', $parentMeeting);

        $data = $request->validate([
            'student_id' => ['sometimes', 'required', 'uuid', 'exists:students,id'],
            'meeting_date' => ['sometimes', 'required', 'date'],
            'tutor_name' => ['nullable', 'string', 'max:255'],
            'day_time' => ['nullable', 'string', 'max:100'],
            'attendees' => ['nullable', 'string', 'max:1000'],
            'modality' => ['nullable', Rule::in(self::VALID_MODALITIES)],
            'confirmation' => ['nullable', Rule::in(self::VALID_CONFIRMATIONS)],
            'observation' => ['nullable', 'string'],
        ]);

        $user = $request->user();

        $parentMeeting->update(array_merge($data, [
            'updated_by_user_id' => $user->id,
        ]));

        $parentMeeting->load(['student:id,first_name,last_name', 'creator:id,name', 'updater:id,name']);

        return response()->json(['data' => $this->transform($parentMeeting)]);
    }

    /**
     * DELETE /api/parent-meetings/{parentMeeting}
     */
    public function destroy(Request $request, ParentMeeting $parentMeeting): JsonResponse
    {
        $this->authorize('delete', $parentMeeting);

        $parentMeeting->delete();

        return response()->json(['message' => 'Parent meeting deleted.'], 200);
    }

    /**
     * GET /api/parent-meetings/student/{student}
     * All meetings for a student — for guardian portal.
     */
    public function forStudent(Student $student): JsonResponse
    {
        $this->authorize('viewAny', ParentMeeting::class);

        $meetings = ParentMeeting::where('student_id', $student->id)
            ->orderByDesc('meeting_date')
            ->get();

        return response()->json([
            'data' => $meetings->map(fn ($m) => $this->transform($m)),
        ]);
    }

    /**
     * GET /api/guardian/children/{student}/meetings
     * Guardian view — only meetings for their linked student.
     */
    public function forGuardian(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        // Verify this guardian is linked to this student
        $isLinked = $guardian->students()->where('student_id', $student->id)->exists();
        if (!$isLinked) {
            return response()->json([
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => 'You are not linked to this student.',
                ],
            ], 403);
        }

        $meetings = ParentMeeting::where('student_id', $student->id)
            ->orderByDesc('meeting_date')
            ->get();

        return response()->json([
            'data' => $meetings->map(fn ($m) => $this->transform($m)),
        ]);
    }

    private function transform(ParentMeeting $meeting): array
    {
        return [
            'id' => $meeting->id,
            'student_id' => $meeting->student_id,
            'student_name' => $meeting->student
                ? "{$meeting->student->first_name} {$meeting->student->last_name}"
                : null,
            'meeting_date' => $meeting->meeting_date?->toDateString(),
            'tutor_name' => $meeting->tutor_name,
            'day_time' => $meeting->day_time,
            'attendees' => $meeting->attendees_list,
            'modality' => $meeting->modality,
            'confirmation' => $meeting->confirmation,
            'observation' => $meeting->observation,
            'scheduled_date_and_time' => $meeting->scheduled_date_and_time,
            'created_by_user_id' => $meeting->created_by_user_id,
            'creator_name' => $meeting->creator?->name,
            'created_at' => $meeting->created_at?->toIsoString(),
        ];
    }
}