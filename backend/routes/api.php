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

    // Leads
    Route::get('leads', [App\Http\Controllers\Api\LeadController::class, 'index'])
        ->name('leads.index');
    Route::get('leads/{lead}', [App\Http\Controllers\Api\LeadController::class, 'show'])
        ->name('leads.show');

    // Students
    Route::get('students', [App\Http\Controllers\Api\StudentController::class, 'index']);
    Route::get('students/{student}', [App\Http\Controllers\Api\StudentController::class, 'show']);

    // Sections
    Route::get('sections', [App\Http\Controllers\Api\SectionController::class, 'index']);

    // Risk alerts
    Route::get('risk-alerts', [App\Http\Controllers\Api\RiskAlertController::class, 'index']);
    Route::patch('risk-alerts/{riskAlert}', [App\Http\Controllers\Api\RiskAlertController::class, 'update']);
});

// Status updates - stricter rate limit (10/min) to prevent pipeline abuse
Route::middleware(['auth:sanctum', 'throttle:10,1'])->group(function () {
    Route::patch('leads/{lead}/status', [App\Http\Controllers\Api\LeadController::class, 'updateStatus'])
        ->name('leads.status.update');
});

// Dashboard stats
Route::middleware(['auth:sanctum'])->get('stats', [App\Http\Controllers\Api\StatsController::class, 'dashboard']);

// Emergency broadcasts
Route::middleware(['auth:sanctum', 'throttle:5,1'])->group(function () {
    Route::get('broadcasts', [App\Http\Controllers\Api\BroadcastController::class, 'index']);
    Route::post('broadcasts', [App\Http\Controllers\Api\BroadcastController::class, 'store']);
});
