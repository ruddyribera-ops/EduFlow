<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGradeRequest;
use App\Http\Requests\UpdateGradeRequest;
use App\Models\Grade;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GradeController extends Controller
{
    /**
     * GET /api/grades?section_id=X&student_id=Y&date_from=Z&date_to=W
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Grade::class);

        $user = $request->user();
        $sectionId = $request->query('section_id');
        $studentId = $request->query('student_id');
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        $type = $request->query('type');

        $query = Grade::with(['student:id,first_name,last_name', 'section:id,name', 'teacher:id,name'])
            ->select('grades.*');

        // Teachers: restrict to their assigned sections
        if ($user->role === 'teacher') {
            $assignedSections = $user->assigned_sections ?? [];
            $query->whereIn('section_id', $assignedSections);
        }

        if ($sectionId) {
            $query->where('section_id', $sectionId);
        }

        if ($studentId) {
            $query->where('student_id', $studentId);
        }

        if ($dateFrom) {
            $query->where('date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->where('date', '<=', $dateTo);
        }

        if ($type) {
            $query->where('type', $type);
        }

        $grades = $query->orderBy('date', 'desc')->paginate(50);

        $records = $grades->map(function ($grade) {
            return [
                'id' => $grade->id,
                'student_id' => $grade->student_id,
                'student_name' => $grade->student ? "{$grade->student->first_name} {$grade->student->last_name}" : null,
                'section_id' => $grade->section_id,
                'section_name' => $grade->section?->name,
                'teacher_id' => $grade->teacher_id,
                'teacher_name' => $grade->teacher?->name,
                'date' => $grade->date,
                'score' => (float) $grade->score,
                'max_score' => (float) $grade->max_score,
                'percentage' => $grade->max_score > 0 ? round(($grade->score / $grade->max_score) * 100, 1) : null,
                'type' => $grade->type,
                'notes' => $grade->notes,
            ];
        });

        return response()->json([
            'data' => $records,
            'meta' => [
                'current_page' => $grades->currentPage(),
                'last_page' => $grades->lastPage(),
                'per_page' => $grades->perPage(),
                'total' => $grades->total(),
            ],
        ]);
    }

    /**
     * GET /api/grades/{id}
     */
    public function show(Grade $grade): JsonResponse
    {
        $this->authorize('view', $grade);

        $grade->load(['student:id,first_name,last_name', 'section:id,name', 'teacher:id,name']);

        return response()->json([
            'data' => [
                'id' => $grade->id,
                'student_id' => $grade->student_id,
                'student_name' => $grade->student ? "{$grade->student->first_name} {$grade->student->last_name}" : null,
                'section_id' => $grade->section_id,
                'section_name' => $grade->section?->name,
                'teacher_id' => $grade->teacher_id,
                'teacher_name' => $grade->teacher?->name,
                'date' => $grade->date,
                'score' => (float) $grade->score,
                'max_score' => (float) $grade->max_score,
                'percentage' => $grade->max_score > 0 ? round(($grade->score / $grade->max_score) * 100, 1) : null,
                'type' => $grade->type,
                'notes' => $grade->notes,
            ],
        ]);
    }

    /**
     * POST /api/grades
     */
    public function store(StoreGradeRequest $request): JsonResponse
    {
        $this->authorize('create', Grade::class);

        $user = $request->user();
        $data = $request->validated();

        // Teachers: verify assigned to section
        if ($user->role === 'teacher' && !in_array($data['section_id'], $user->assigned_sections ?? [])) {
            return response()->json(['error' => ['code' => 'FORBIDDEN', 'message' => 'Not assigned to this section']], 403);
        }

        $grade = Grade::create(array_merge($data, [
            'teacher_id' => $user->id,
        ]));

        $grade->load(['student:id,first_name,last_name', 'section:id,name', 'teacher:id,name']);

        return response()->json([
            'data' => [
                'id' => $grade->id,
                'student_id' => $grade->student_id,
                'student_name' => $grade->student ? "{$grade->student->first_name} {$grade->student->last_name}" : null,
                'section_id' => $grade->section_id,
                'section_name' => $grade->section?->name,
                'teacher_id' => $grade->teacher_id,
                'teacher_name' => $grade->teacher?->name,
                'date' => $grade->date,
                'score' => (float) $grade->score,
                'max_score' => (float) $grade->max_score,
                'percentage' => $grade->max_score > 0 ? round(($grade->score / $grade->max_score) * 100, 1) : null,
                'type' => $grade->type,
                'notes' => $grade->notes,
            ],
        ], 201);
    }

    /**
     * PATCH /api/grades/{id}
     */
    public function update(UpdateGradeRequest $request, Grade $grade): JsonResponse
    {
        $this->authorize('update', $grade);

        $user = $request->user();

        // Teachers: verify assigned to section
        if ($user->role === 'teacher' && !in_array($grade->section_id, $user->assigned_sections ?? [])) {
            return response()->json(['error' => ['code' => 'FORBIDDEN', 'message' => 'Not assigned to this section']], 403);
        }

        $data = $request->validated();

        $grade->update($data);
        $grade->load(['student:id,first_name,last_name', 'section:id,name', 'teacher:id,name']);

        return response()->json([
            'data' => [
                'id' => $grade->id,
                'student_id' => $grade->student_id,
                'student_name' => $grade->student ? "{$grade->student->first_name} {$grade->student->last_name}" : null,
                'section_id' => $grade->section_id,
                'section_name' => $grade->section?->name,
                'teacher_id' => $grade->teacher_id,
                'teacher_name' => $grade->teacher?->name,
                'date' => $grade->date,
                'score' => (float) $grade->score,
                'max_score' => (float) $grade->max_score,
                'percentage' => $grade->max_score > 0 ? round(($grade->score / $grade->max_score) * 100, 1) : null,
                'type' => $grade->type,
                'notes' => $grade->notes,
            ],
        ]);
    }

    /**
     * DELETE /api/grades/{id}
     */
    public function destroy(Request $request, Grade $grade): JsonResponse
    {
        $this->authorize('delete', $grade);

        $grade->delete();

        return response()->json(null, 204);
    }
}