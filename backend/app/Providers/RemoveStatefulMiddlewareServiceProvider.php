<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Laravel\Sanctum\Sanctum;

class RemoveStatefulMiddlewareServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Sanctum's service provider prepends EnsureFrontendRequestsAreStateful to
        // the middleware priority. Since EduFlow uses pure token auth (no cookie sessions),
        // we override the middleware to do nothing.
        $this->app->extend(EnsureFrontendRequestsAreStateful::class, function () {
            return new class {
                public function handle($request, $next) {
                    return $next($request);
                }
            };
        });
    }
}
