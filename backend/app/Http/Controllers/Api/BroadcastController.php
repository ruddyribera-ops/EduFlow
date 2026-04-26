<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BroadcastController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // Return empty history for now (broadcast history not persisted yet)
        return response()->json([
            'data' => [],
            'meta' => ['total' => 0],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|min:3|max:500',
            'scope' => 'required|in:all,students',
            'student_ids' => 'array',
            'student_ids.*' => 'uuid',
        ]);

        $message = $request->input('message');
        $scope = $request->input('scope');
        $studentIds = $request->input('student_ids', []);

        // Get students for scope
        $query = Student::query();
        if ($scope === 'students' && count($studentIds) > 0) {
            $query->whereIn('id', $studentIds);
        }

        $students = $query->get();

        // Get guardians for these students
        $guardianIds = [];
        $emailCount = 0;
        $smsCount = 0;
        $skippedCount = 0;

        foreach ($students as $student) {
            $guardians = $student->guardians;
            foreach ($guardians as $guardian) {
                if (!isset($guardianIds[$guardian->id])) {
                    $guardianIds[$guardian->id] = $guardian;
                }
            }
        }

        // Count by communication preference
        foreach ($guardianIds as $guardian) {
            $pref = $guardian->communication_preference->value;
            if ($pref === 'email_only' || $pref === 'both') {
                $emailCount++;
            }
            if ($pref === 'sms_only' || $pref === 'both') {
                $smsCount++;
            }
            if ($pref === 'both') {
                // Counted in both, but total recipients is unique guardians
            }
            if (!$guardian->phone && $pref === 'sms_only') {
                $skippedCount++;
            }
            if (!$guardian->email && $pref === 'email_only') {
                $skippedCount++;
            }
        }

        $totalRecipients = count($guardianIds);

        // TODO: implement real email/SMS dispatch via Twilio/SendGrid for email and Vonage for SMS.
        // Currently broadcasts are simulated — no actual messages are sent.
        // Persist broadcast records to a `broadcasts` table for history tracking.
        $broadcastId = Str::uuid()->toString();

        return response()->json([
            'data' => [
                'id' => $broadcastId,
                'message' => $message,
                'scope' => $scope,
                'student_ids' => $scope === 'students' ? $studentIds : null,
                'total' => $totalRecipients,
                'email_sent' => $emailCount,
                'sms_sent' => $smsCount,
                'skipped' => $skippedCount,
                'sent_at' => now()->toIso8601String(),
            ],
        ], 201);
    }
}