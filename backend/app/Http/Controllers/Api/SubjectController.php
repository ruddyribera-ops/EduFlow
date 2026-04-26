<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;

class SubjectController extends Controller
{
    /**
     * GET /api/subjects
     */
    public function index(): JsonResponse
    {
        $subjects = Subject::orderBy('name')->get();

        return response()->json([
            'data' => $subjects->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'code' => $s->code,
                'area' => $s->area,
                'campo' => $s->campo,
                'level' => $s->level,
            ]),
        ]);
    }

    /**
     * GET /api/subjects/{id}
     */
    public function show(Subject $subject): JsonResponse
    {
        $subject->load('sections:id,name,grade_level,room,semester');

        return response()->json([
            'data' => [
                'id' => $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
                'area' => $subject->area,
                'campo' => $subject->campo,
                'level' => $subject->level,
                'sections' => $subject->sections->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'grade_level' => $s->grade_level,
                    'room' => $s->room,
                    'semester' => $s->semester,
                ]),
            ],
        ]);
    }
}