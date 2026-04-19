<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo($request): ?string
    {
        // For API routes, return null so the exception (not a redirect) is thrown.
        // The exception handler will return JSON {message: "Unauthenticated."}
        if ($request->is('api/*')) {
            return null;
        }

        return route('login');
    }
}
