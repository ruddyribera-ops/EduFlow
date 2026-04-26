<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    /**
     * GET /api/attendances?section_id=X&date=Y
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Attendance::class);

        $sectionId = $request->query('section_id');
        $date = $request->query('date', now()->toDateString());

        if (!$sectionId) {
            return response()->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'section_id is required', 'field' => 'section_id']], 400);
        }

        $section = Section::findOrFail($sectionId);

        // Teacher: check section assignment
        $user = $request->user();
        if ($user->role === 'teacher' && !in_array($sectionId, $user->assigned_sections ?? [])) {
            return response()->json(['error' => ['code' => 'FORBIDDEN', 'message' => 'Not assigned to this section']], 403);
        }

        // Fetch students in this section with their attendance for the date
        $studentIds = DB::table('section_student')
            ->where('section_id', $sectionId)
            ->pluck('student_id');

        $attendances = Attendance::where('section_id', $sectionId)
            ->where('date', $date)
            ->whereIn('student_id', $studentIds)
            ->with('student:id,first_name,last_name,grade_level')
            ->get();

        $records = $attendances->map(function ($att) {
            return [
                'id' => $att->id,
                'student_id' => $att->student_id,
                'student_name' => $att->student ? "{$att->student->first_name} {$att->student->last_name}" : null,
                'grade_level' => $att->student?->grade_level,
                'status' => $att->status,
                'notes' => $att->notes,
                'marked_by_user_id' => $att->marked_by_user_id,
                'marked_at' => $att->marked_at?->toIsoString(),
            ];
        });

        return response()->json([
            'data' => $records,
            'meta' => [
                'section_id' => $sectionId,
                'date' => $date,
                'total' => $records->count(),
            ],
        ]);
    }

    /**
     * POST /api/attendances/batch
     * Mark attendance for all students in a section on a given date.
     */
    public function batch(Request $request): JsonResponse
    {
        $this->authorize('create', Attendance::class);

        $data = $request->validate([
            'section_id' => ['required', 'uuid', 'exists:sections,id'],
            'date' => ['required', 'date'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'uuid', 'exists:students,id'],
            'records.*.status' => ['required', 'string', 'in:present,absent,tardy,excused'],
            'records.*.notes' => ['nullable', 'string', 'max:500'],
        ]);

        $user = $request->user();
        $now = now();

        // Teacher: verify section assignment
        if ($user->role === 'teacher' && !in_array($data['section_id'], $user->assigned_sections ?? [])) {
            return response()->json(['error' => ['code' => 'FORBIDDEN', 'message' => 'Not assigned to this section']], 403);
        }

        $records = $data['records'];
        $upserted = [];

        DB::transaction(function () use ($data, $records, $user, $now, &$upserted) {
            foreach ($records as $record) {
                $att = Attendance::updateOrCreate(
                    [
                        'student_id' => $record['student_id'],
                        'section_id' => $data['section_id'],
                        'date' => $data['date'],
                    ],
                    [
                        'status' => $record['status'],
                        'notes' => $record['notes'] ?? null,
                        'marked_by_user_id' => $user->id,
                        'marked_at' => $now,
                    ]
                );
                $upserted[] = [
                    'id' => $att->id,
                    'student_id' => $att->student_id,
                    'status' => $att->status,
                    'notes' => $att->notes,
                    'marked_by_user_id' => $att->marked_by_user_id,
                    'marked_at' => $att->marked_at?->toIsoString(),
                ];
            }
        });

        // Summary
        $counts = array_count_values(array_column($upserted, 'status'));

        return response()->json([
            'data' => $upserted,
            'meta' => [
                'section_id' => $data['section_id'],
                'date' => $data['date'],
                'total' => count($upserted),
                'present' => $counts['present'] ?? 0,
                'absent' => $counts['absent'] ?? 0,
                'tardy' => $counts['tardy'] ?? 0,
                'excused' => $counts['excused'] ?? 0,
            ],
        ], 201);
    }

    /**
     * PATCH /api/attendances/{id}
     */
    public function update(Request $request, Attendance $attendance): JsonResponse
    {
        $this->authorize('update', $attendance);

        $data = $request->validate([
            'status' => ['sometimes', 'required', 'string', 'in:present,absent,tardy,excused'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $user = $request->user();

        // Teacher: check section assignment
        if ($user->role === 'teacher' && !in_array($attendance->section_id, $user->assigned_sections ?? [])) {
            return response()->json(['error' => ['code' => 'FORBIDDEN', 'message' => 'Not assigned to this section']], 403);
        }

        $attendance->update([
            'status' => $data['status'] ?? $attendance->status,
            'notes' => array_key_exists('notes', $data) ? $data['notes'] : $attendance->notes,
            'marked_by_user_id' => $user->id,
            'marked_at' => now(),
        ]);

        $attendance->load('student:id,first_name,last_name,grade_level');

        return response()->json([
            'data' => [
                'id' => $attendance->id,
                'student_id' => $attendance->student_id,
                'student_name' => $attendance->student ? "{$attendance->student->first_name} {$attendance->student->last_name}" : null,
                'status' => $attendance->status,
                'notes' => $attendance->notes,
                'marked_by_user_id' => $attendance->marked_by_user_id,
                'marked_at' => $attendance->marked_at?->toIsoString(),
            ],
        ]);
    }
}