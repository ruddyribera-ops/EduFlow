<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class SectionController extends Controller
{
    private const VALID_SEMESTERS = ['fall', 'spring', 'summer'];

    /**
     * GET /api/sections
     */
    public function index(Request $request): JsonResponse
    {
        $query = Section::query()
            ->with(['teachers', 'students', 'counselor'])
            ->when($request->grade_level, fn($q) => $q->where('grade_level', $request->grade_level));

        $sections = $query->paginate($request->get('per_page', 25));

        return response()->json([
            'data' => $sections->items(),
            'meta' => [
                'current_page' => $sections->currentPage(),
                'last_page' => $sections->lastPage(),
                'per_page' => $sections->perPage(),
                'total' => $sections->total(),
            ],
        ]);
    }

    /**
     * POST /api/sections
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Section::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'grade_level' => ['required', 'string', 'max:50'],
            'room' => ['nullable', 'string', 'max:50'],
            'semester' => ['required', Rule::in(self::VALID_SEMESTERS)],
            'counselor_id' => ['nullable', 'uuid', 'exists:users,id'],
        ]);

        $section = Section::create([
            'name' => $data['name'],
            'grade_level' => $data['grade_level'],
            'room' => $data['room'] ?? null,
            'semester' => $data['semester'],
            'counselor_id' => $data['counselor_id'] ?? null,
        ]);

        $section->load(['teachers', 'students', 'counselor']);

        return response()->json(['data' => $section], 201);
    }

    /**
     * GET /api/sections/{section}
     */
    public function show(Section $section): JsonResponse
    {
        $section->load(['teachers', 'students', 'counselor']);
        return response()->json(['data' => $section]);
    }

    /**
     * PATCH /api/sections/{section}
     */
    public function update(Request $request, Section $section): JsonResponse
    {
        $this->authorize('update', $section);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'grade_level' => ['sometimes', 'required', 'string', 'max:50'],
            'room' => ['nullable', 'string', 'max:50'],
            'semester' => ['sometimes', 'required', Rule::in(self::VALID_SEMESTERS)],
            'counselor_id' => ['nullable', 'uuid', 'exists:users,id'],
        ]);

        $section->update($data);
        $section->load(['teachers', 'students', 'counselor']);

        return response()->json(['data' => $section]);
    }

    /**
     * DELETE /api/sections/{section}
     */
    public function destroy(Section $section): JsonResponse
    {
        $this->authorize('delete', $section);
        $section->delete();
        return response()->json(['message' => 'Section deleted.'], 200);
    }

    /**
     * POST /api/sections/{section}/teachers/{teacher}
     */
    public function assignTeacher(Section $section, User $teacher): JsonResponse
    {
        $this->authorize('update', $section);

        if ($teacher->role !== User::ROLE_TEACHER) {
            return response()->json(['message' => 'User must be a teacher.'], 422);
        }

        // Composite PK pivot — use DB::table
        DB::table('section_teacher')->insert([
            'section_id' => $section->id,
            'teacher_id' => $teacher->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $section->load(['teachers', 'students', 'counselor']);

        return response()->json(['data' => $section->teachers]);
    }

    /**
     * DELETE /api/sections/{section}/teachers/{teacher}
     */
    public function removeTeacher(Section $section, User $teacher): JsonResponse
    {
        $this->authorize('update', $section);

        DB::table('section_teacher')
            ->where('section_id', $section->id)
            ->where('teacher_id', $teacher->id)
            ->delete();

        $section->load(['teachers', 'students', 'counselor']);

        return response()->json(['message' => 'Teacher removed from section.']);
    }

    /**
     * POST /api/sections/{section}/students/{student}
     */
    public function assignStudent(Section $section, Student $student): JsonResponse
    {
        $this->authorize('update', $section);

        // Composite PK pivot
        DB::table('section_student')->insert([
            'section_id' => $section->id,
            'student_id' => $student->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $section->load(['teachers', 'students', 'counselor']);

        return response()->json(['data' => $section->students]);
    }

    /**
     * DELETE /api/sections/{section}/students/{student}
     */
    public function removeStudent(Section $section, Student $student): JsonResponse
    {
        $this->authorize('update', $section);

        DB::table('section_student')
            ->where('section_id', $section->id)
            ->where('student_id', $student->id)
            ->delete();

        $section->load(['teachers', 'students', 'counselor']);

        return response()->json(['message' => 'Student removed from section.']);
    }
}
