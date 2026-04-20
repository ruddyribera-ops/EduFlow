<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminOrCounselor
{
    public function handle(Request $request, Closure $next): Response
    {
        $role = $request->user()?->role;
        if ($role !== User::ROLE_ADMIN && $role !== User::ROLE_COUNSELOR) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        return $next($request);
    }
}
