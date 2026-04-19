<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Student::query()
            ->when($request->grade_level, fn($q) => $q->where('grade_level', $request->grade_level))
            ->when($request->enrollment_status, fn($q) => $q->where('enrollment_status', $request->enrollment_status))
            ->with(['guardians']);

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

    public function show(Student $student): JsonResponse
    {
        $student->load(['guardians', 'sections', 'attendances', 'grades']);
        return response()->json(['data' => $student]);
    }
}