<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['message' => 'EduFlow API v1', 'status' => 'running'];
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| Rate limited: 60 requests per minute per user.
| Status updates: 10 requests per minute (stricter to prevent spam).
*/
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
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
});

// Status updates - stricter rate limit (10/min) to prevent pipeline abuse
Route::middleware(['auth:sanctum', 'throttle:10,1'])->group(function () {
    Route::patch('leads/{lead}/status', [App\Http\Controllers\Api\LeadController::class, 'updateStatus'])
        ->name('leads.status.update');
});