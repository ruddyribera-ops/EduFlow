<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['message' => 'EduFlow API v1', 'status' => 'running'];
});

/*
|--------------------------------------------------------------------------
| Auth (public login, stricter throttle)
|--------------------------------------------------------------------------
*/
Route::post('auth/login', [App\Http\Controllers\Api\AuthController::class, 'login'])
    ->middleware('throttle:10,1')
    ->name('auth.login');

/*
|--------------------------------------------------------------------------
| API Routes (authenticated, 60/min)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    // Auth (protected)
    Route::get('auth/me', [App\Http\Controllers\Api\AuthController::class, 'me'])->name('auth.me');
    Route::post('auth/logout', [App\Http\Controllers\Api\AuthController::class, 'logout'])->name('auth.logout');
    Route::patch('auth/profile', [App\Http\Controllers\Api\AuthController::class, 'updateProfile']);
    Route::patch('auth/password', [App\Http\Controllers\Api\AuthController::class, 'updatePassword']);

    // Users (admin only for write; any auth'd user can read list/show)
    Route::middleware(App\Http\Middleware\AdminOnly::class)->group(function () {
        Route::post('users', [App\Http\Controllers\Api\UserController::class, 'store']);
        Route::patch('users/{user}', [App\Http\Controllers\Api\UserController::class, 'update']);
        Route::delete('users/{user}', [App\Http\Controllers\Api\UserController::class, 'destroy']);
        Route::post('users/{user}/reset-password', [App\Http\Controllers\Api\UserController::class, 'resetPassword']);
    });
    Route::get('users', [App\Http\Controllers\Api\UserController::class, 'index']);
    Route::get('users/{user}', [App\Http\Controllers\Api\UserController::class, 'show']);

    // Leads (write: admin+counselor)
    Route::middleware(App\Http\Middleware\AdminOrCounselor::class)->group(function () {
        Route::post('leads', [App\Http\Controllers\Api\LeadController::class, 'store']);
        Route::patch('leads/{lead}', [App\Http\Controllers\Api\LeadController::class, 'update']);
        Route::delete('leads/{lead}', [App\Http\Controllers\Api\LeadController::class, 'destroy']);
    });
    Route::get('leads', [App\Http\Controllers\Api\LeadController::class, 'index'])
        ->name('leads.index');
    Route::get('leads/{lead}', [App\Http\Controllers\Api\LeadController::class, 'show'])
        ->name('leads.show');

    // Students (write: admin+counselor)
    Route::middleware(App\Http\Middleware\AdminOrCounselor::class)->group(function () {
        Route::post('students', [App\Http\Controllers\Api\StudentController::class, 'store']);
        Route::patch('students/{student}', [App\Http\Controllers\Api\StudentController::class, 'update']);
        Route::delete('students/{student}', [App\Http\Controllers\Api\StudentController::class, 'destroy']);
        // Guardian attach/detach (student -> guardian relationship)
        Route::post('students/{student}/guardians', [App\Http\Controllers\Api\GuardianController::class, 'attachToStudent']);
        Route::delete('students/{student}/guardians/{guardian}', [App\Http\Controllers\Api\GuardianController::class, 'detachFromStudent']);
    });
    Route::get('students', [App\Http\Controllers\Api\StudentController::class, 'index']);
    Route::get('students/{student}', [App\Http\Controllers\Api\StudentController::class, 'show']);

    // Guardians (write: admin+counselor; read: any auth'd)
    Route::middleware(App\Http\Middleware\AdminOrCounselor::class)->group(function () {
        Route::post('guardians', [App\Http\Controllers\Api\GuardianController::class, 'store']);
        Route::patch('guardians/{guardian}', [App\Http\Controllers\Api\GuardianController::class, 'update']);
        Route::delete('guardians/{guardian}', [App\Http\Controllers\Api\GuardianController::class, 'destroy']);
    });
    Route::get('guardians', [App\Http\Controllers\Api\GuardianController::class, 'index']);
    Route::get('guardians/{guardian}', [App\Http\Controllers\Api\GuardianController::class, 'show']);

    // Sections (write: admin+counselor)
    Route::middleware(App\Http\Middleware\AdminOrCounselor::class)->group(function () {
        Route::post('sections', [App\Http\Controllers\Api\SectionController::class, 'store']);
        Route::patch('sections/{section}', [App\Http\Controllers\Api\SectionController::class, 'update']);
        Route::delete('sections/{section}', [App\Http\Controllers\Api\SectionController::class, 'destroy']);
        // Teacher assignment
        Route::post('sections/{section}/teachers/{teacher}', [App\Http\Controllers\Api\SectionController::class, 'assignTeacher']);
        Route::delete('sections/{section}/teachers/{teacher}', [App\Http\Controllers\Api\SectionController::class, 'removeTeacher']);
        // Student assignment
        Route::post('sections/{section}/students/{student}', [App\Http\Controllers\Api\SectionController::class, 'assignStudent']);
        Route::delete('sections/{section}/students/{student}', [App\Http\Controllers\Api\SectionController::class, 'removeStudent']);
    });
    Route::get('sections', [App\Http\Controllers\Api\SectionController::class, 'index']);
    Route::get('sections/{section}', [App\Http\Controllers\Api\SectionController::class, 'show']);

    // Risk alerts
    Route::middleware(App\Http\Middleware\AdminOrCounselor::class)->group(function () {
        Route::post('risk-alerts', [App\Http\Controllers\Api\RiskAlertController::class, 'store']);
    });
    Route::get('risk-alerts', [App\Http\Controllers\Api\RiskAlertController::class, 'index']);
    Route::patch('risk-alerts/{riskAlert}', [App\Http\Controllers\Api\RiskAlertController::class, 'update']);

    // Per-student risk alerts
    Route::get('students/{student}/risk-alerts', [App\Http\Controllers\Api\RiskAlertController::class, 'getStudentRiskAlerts']);

    // Grades
    Route::get('grades', [App\Http\Controllers\Api\GradeController::class, 'index']);
    Route::get('grades/{grade}', [App\Http\Controllers\Api\GradeController::class, 'show']);
    Route::post('grades', [App\Http\Controllers\Api\GradeController::class, 'store']);
    Route::patch('grades/{grade}', [App\Http\Controllers\Api\GradeController::class, 'update']);
    Route::delete('grades/{grade}', [App\Http\Controllers\Api\GradeController::class, 'destroy']);

    // Subjects (auth required)
    Route::get('subjects', [App\Http\Controllers\Api\SubjectController::class, 'index']);
    Route::get('subjects/{subject}', [App\Http\Controllers\Api\SubjectController::class, 'show']);

    // Incidents
    Route::apiResource('incidents', App\Http\Controllers\Api\IncidentController::class)->only(['index', 'show', 'store']);
    Route::patch('incidents/{incident}/resolve', [App\Http\Controllers\Api\IncidentController::class, 'resolve']);

    // Attendance
    Route::get('attendances', [App\Http\Controllers\Api\AttendanceController::class, 'index']);
    Route::post('attendances/batch', [App\Http\Controllers\Api\AttendanceController::class, 'batch']);
    Route::patch('attendances/{attendance}', [App\Http\Controllers\Api\AttendanceController::class, 'update']);

    // Parent Meetings
    Route::get('parent-meetings', [App\Http\Controllers\Api\ParentMeetingController::class, 'index']);
    Route::post('parent-meetings', [App\Http\Controllers\Api\ParentMeetingController::class, 'store']);
    Route::get('parent-meetings/{parentMeeting}', [App\Http\Controllers\Api\ParentMeetingController::class, 'show']);
    Route::patch('parent-meetings/{parentMeeting}', [App\Http\Controllers\Api\ParentMeetingController::class, 'update']);
    Route::delete('parent-meetings/{parentMeeting}', [App\Http\Controllers\Api\ParentMeetingController::class, 'destroy']);
    Route::get('parent-meetings/student/{student}', [App\Http\Controllers\Api\ParentMeetingController::class, 'forStudent']);
});

// Status updates - stricter rate limit (10/min) to prevent pipeline abuse
Route::middleware(['auth:sanctum', 'throttle:10,1'])->group(function () {
    Route::patch('leads/{lead}/status', [App\Http\Controllers\Api\LeadController::class, 'updateStatus'])
        ->name('leads.status.update');
});

// Dashboard stats
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::get('stats', [App\Http\Controllers\Api\StatsController::class, 'dashboard']);
    Route::get('stats/enrollment-over-time', [App\Http\Controllers\Api\StatsController::class, 'enrollmentOverTime']);
    Route::get('stats/attendance-trend',    [App\Http\Controllers\Api\StatsController::class, 'attendanceTrend']);
    Route::get('stats/incident-trend',       [App\Http\Controllers\Api\StatsController::class, 'incidentTrend']);
});

// Emergency broadcasts
Route::middleware(['auth:sanctum', 'throttle:5,1'])->group(function () {
    Route::get('broadcasts', [App\Http\Controllers\Api\BroadcastController::class, 'index']);
    Route::post('broadcasts', [App\Http\Controllers\Api\BroadcastController::class, 'store']);
});

/*
|--------------------------------------------------------------------------
| Guardian Auth (public)
|--------------------------------------------------------------------------
*/
Route::post('guardian-auth/login', [App\Http\Controllers\Api\GuardianAuthController::class, 'login'])
    ->middleware('throttle:10,1');

/*
|--------------------------------------------------------------------------
| Guardian-protected routes (separate guard from staff)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum:guardian', 'throttle:60,1'])->group(function () {
    Route::post('guardian-auth/logout', [App\Http\Controllers\Api\GuardianAuthController::class, 'logout']);
    Route::get('guardian-auth/me', [App\Http\Controllers\Api\GuardianAuthController::class, 'me']);

    // Guardian portal: view their children's data
    Route::get('guardian/children', [App\Http\Controllers\Api\GuardianController::class, 'myChildren']);
    Route::get('guardian/children/{student}/incidents', [App\Http\Controllers\Api\IncidentController::class, 'guardianStudentIncidents']);
    Route::get('guardian/children/{student}/grades', [App\Http\Controllers\Api\GradeController::class, 'guardianStudentGrades']);
    Route::get('guardian/children/{student}/attendance', [App\Http\Controllers\Api\AttendanceController::class, 'guardianStudentAttendance']);
    Route::get('guardian/children/{student}/meetings', [App\Http\Controllers\Api\ParentMeetingController::class, 'forGuardian']);
});