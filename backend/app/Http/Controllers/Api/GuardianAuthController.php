<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class GuardianAuthController extends Controller
{
    /**
     * POST /api/guardian-auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $guardian = Guardian::where('email', $data['email'])->first();

        if (!$guardian || !$guardian->password || !Hash::check($data['password'], $guardian->password)) {
            return response()->json([
                'error' => [
                    'code' => 'INVALID_CREDENTIALS',
                    'message' => 'Invalid email or password.',
                ],
            ], 401);
        }

        $token = $guardian->createToken('guardian-auth')->plainTextToken;

        $guardian->load(['students']);

        return response()->json([
            'data' => [
                'token' => $token,
                'guardian' => [
                    'id' => $guardian->id,
                    'first_name' => $guardian->first_name,
                    'last_name' => $guardian->last_name,
                    'full_name' => $guardian->full_name,
                    'email' => $guardian->email,
                    'phone' => $guardian->phone,
                    'communication_preference' => $guardian->communication_preference?->value,
                    'students' => $guardian->students->map(fn ($s) => [
                        'id' => $s->id,
                        'full_name' => $s->full_name,
                        'grade_level' => $s->grade_level,
                    ])->toArray(),
                ],
            ],
        ]);
    }

    /**
     * POST /api/guardian-auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    /**
     * GET /api/guardian-auth/me
     */
    public function me(Request $request): JsonResponse
    {
        $guardian = $request->user();
        $guardian->load(['students']);

        return response()->json([
            'data' => [
                'id' => $guardian->id,
                'first_name' => $guardian->first_name,
                'last_name' => $guardian->last_name,
                'full_name' => $guardian->full_name,
                'email' => $guardian->email,
                'phone' => $guardian->phone,
                'communication_preference' => $guardian->communication_preference?->value,
                'students' => $guardian->students->map(fn ($s) => [
                    'id' => $s->id,
                    'full_name' => $s->full_name,
                    'grade_level' => $s->grade_level,
                    'pivot' => $s->pivot,
                ])->toArray(),
            ],
        ]);
    }
}