<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    private const VALID_ENROLLMENT_STATUSES = ['inquiry', 'applied', 'accepted', 'enrolled', 'withdrawn', 'graduated'];

    /**
     * GET /api/students
     */
    public function index(Request $request): JsonResponse
    {
        $query = Student::query()
            ->when($request->grade_level, fn($q) => $q->where('grade_level', $request->grade_level))
            ->when($request->enrollment_status, fn($q) => $q->where('enrollment_status', $request->enrollment_status))
            ->with(['guardians', 'sections']);

        $students = $query->paginate($request->get('per_page', 25));

        return response()->json([
            'data' => $students->items(),
            'meta' => [
                'current_page' => $students->currentPage(),
                'last_page' => $students->lastPage(),
                'per_page' => $students->perPage(),
                'total' => $students->total(),
            ],
        ]);
    }

    /**
     * GET /api/students/{student}
     */
    public function show(Student $student): JsonResponse
    {
        $student->load(['guardians', 'sections', 'attendances', 'grades']);
        return response()->json(['data' => $student]);
    }

    /**
     * POST /api/students
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Student::class);

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'date_of_birth' => ['nullable', 'date'],
            'grade_level' => ['required', 'string', 'max:50'],
            'enrollment_status' => ['required', Rule::in(self::VALID_ENROLLMENT_STATUSES)],
            'section_id' => ['nullable', 'uuid'],
        ]);

        $student = Student::create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'dob' => $data['date_of_birth'] ?? null,
            'grade_level' => $data['grade_level'],
            'enrollment_status' => $data['enrollment_status'],
            'section_id' => $data['section_id'] ?? null,
        ]);

        $student->load(['guardians', 'sections']);

        return response()->json(['data' => $student], 201);
    }

    /**
     * PATCH /api/students/{student}
     */
    public function update(Request $request, Student $student): JsonResponse
    {
        $this->authorize('update', $student);

        $data = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'date_of_birth' => ['nullable', 'date'],
            'grade_level' => ['sometimes', 'required', 'string', 'max:50'],
            'enrollment_status' => ['sometimes', 'required', Rule::in(self::VALID_ENROLLMENT_STATUSES)],
            'section_id' => ['nullable', 'uuid'],
        ]);

        $student->update([
            'first_name' => $data['first_name'] ?? $student->first_name,
            'last_name' => $data['last_name'] ?? $student->last_name,
            'dob' => array_key_exists('date_of_birth', $data) ? $data['date_of_birth'] : $student->dob,
            'grade_level' => $data['grade_level'] ?? $student->grade_level,
            'enrollment_status' => $data['enrollment_status'] ?? $student->enrollment_status,
            'section_id' => array_key_exists('section_id', $data) ? $data['section_id'] : $student->section_id,
        ]);

        $student->load(['guardians', 'sections']);

        return response()->json(['data' => $student]);
    }

    /**
     * DELETE /api/students/{student}
     */
    public function destroy(Student $student): JsonResponse
    {
        $this->authorize('delete', $student);
        $student->delete();
        return response()->json(['message' => 'Student deleted.'], 200);
    }
}
