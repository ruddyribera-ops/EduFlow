<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Named route for Authenticate middleware's redirectTo callback
// Redirects to the frontend login page
Route::get('/login', function () {
    $frontend = env('FRONTEND_URL', 'http://localhost:3000');
    return redirect($frontend . '/en/login');
})->name('login');