<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class GuardianController extends Controller
{
    private const VALID_COMMUNICATION_PREFERENCES = ['email_only', 'sms_only', 'both'];

    /**
     * GET /api/guardians?search=
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Guardian::class);

        $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $query = Guardian::query()
            ->when($request->search, function ($q) use ($request) {
                $term = $request->search;
                $q->where(function ($q2) use ($term) {
                    $q2->where('first_name', 'ilike', "%{$term}%")
                       ->orWhere('last_name', 'ilike', "%{$term}%")
                       ->orWhere('email', 'ilike', "%{$term}%");
                });
            })
            ->orderBy('last_name')
            ->orderBy('first_name');

        $guardians = $query->paginate($request->get('per_page', 50));

        return response()->json([
            'data' => $guardians->items(),
            'meta' => [
                'total' => $guardians->total(),
                'per_page' => $guardians->perPage(),
                'current_page' => $guardians->currentPage(),
            ],
        ]);
    }

    /**
     * POST /api/guardians
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Guardian::class);

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('guardians', 'email')],
            'phone' => ['nullable', 'string', 'max:30'],
            'communication_preference' => ['required', Rule::in(self::VALID_COMMUNICATION_PREFERENCES)],
        ]);

        $guardian = Guardian::create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'communication_preference' => $data['communication_preference'],
        ]);

        return response()->json(['data' => $guardian], 201);
    }

    /**
     * GET /api/guardians/{guardian}
     */
    public function show(Guardian $guardian): JsonResponse
    {
        $this->authorize('view', $guardian);
        $guardian->load(['students']);
        return response()->json(['data' => $guardian]);
    }

    /**
     * PATCH /api/guardians/{guardian}
     */
    public function update(Request $request, Guardian $guardian): JsonResponse
    {
        $this->authorize('update', $guardian);

        $data = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', Rule::unique('guardians', 'email')->ignore($guardian->id)],
            'phone' => ['nullable', 'string', 'max:30'],
            'communication_preference' => ['sometimes', 'required', Rule::in(self::VALID_COMMUNICATION_PREFERENCES)],
        ]);

        $guardian->update($data);
        $guardian->load(['students']);

        return response()->json(['data' => $guardian]);
    }

    /**
     * DELETE /api/guardians/{guardian}
     */
    public function destroy(Guardian $guardian): JsonResponse
    {
        $this->authorize('delete', $guardian);
        $guardian->delete();
        return response()->json(['message' => 'Guardian deleted.'], 200);
    }

    /**
     * POST /api/students/{student}/guardians
     * Body: { guardian_id, relationship_type, is_emergency_contact, can_pickup }
     */
    public function attachToStudent(Request $request, Student $student): JsonResponse
    {
        $data = $request->validate([
            'guardian_id' => ['required', 'uuid', 'exists:guardians,id'],
            'relationship_type' => ['required', 'string', 'max:50'],
            'is_emergency_contact' => ['boolean'],
            'can_pickup' => ['boolean'],
        ]);

        $guardian = Guardian::find($data['guardian_id']);
        $this->authorize('attachToStudent', [$guardian, $student]);

        // Use DB::table for composite PK pivot (BelongsToMany::attach() doesn't work with composite PKs)
        DB::table('household_members')->insert([
            'student_id' => $student->id,
            'guardian_id' => $data['guardian_id'],
            'relationship_type' => $data['relationship_type'],
            'is_emergency_contact' => $data['is_emergency_contact'] ?? false,
            'can_pickup' => $data['can_pickup'] ?? true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $student->load(['guardians']);

        return response()->json(['data' => $student->guardians], 201);
    }

    /**
     * DELETE /api/students/{student}/guardians/{guardian}
     */
    public function detachFromStudent(Student $student, Guardian $guardian): JsonResponse
    {
        $this->authorize('detachFromStudent', [$guardian, $student]);

        DB::table('household_members')
            ->where('student_id', $student->id)
            ->where('guardian_id', $guardian->id)
            ->delete();

        return response()->json(['message' => 'Guardian removed from student.'], 200);
    }

    /**
     * GET /api/guardian/children
     * Guardian portal: list all children linked to the authenticated guardian.
     */
    public function myChildren(Request $request): JsonResponse
    {
        $guardian = $request->user();
        $guardian->load(['students']);

        return response()->json([
            'data' => $guardian->students->map(fn ($s) => [
                'id' => $s->id,
                'first_name' => $s->first_name,
                'last_name' => $s->last_name,
                'full_name' => $s->full_name,
                'grade_level' => $s->grade_level,
                'enrollment_status' => $s->enrollment_status,
                'relationship_type' => $s->pivot?->relationship_type,
                'is_emergency_contact' => $s->pivot?->is_emergency_contact,
                'can_pickup' => $s->pivot?->can_pickup,
            ]),
        ]);
    }
}
