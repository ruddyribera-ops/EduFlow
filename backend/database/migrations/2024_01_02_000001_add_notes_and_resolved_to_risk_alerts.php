<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add `notes` column used by the PATCH endpoint + UI alert detail panel.
        Schema::table('risk_alerts', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('risk_factors');
        });

        // Postgres enum types are immutable — recreate the CHECK via a string
        // swap so the frontend's `resolved` status is accepted alongside the
        // existing `pending | reviewed | escalated` values. Laravel's ->enum()
        // leaves behind a `risk_alerts_status_check` CHECK constraint that
        // survives the TYPE swap, so we drop it before adding the wider one.
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE risk_alerts ALTER COLUMN status TYPE VARCHAR(20) USING status::text');
            DB::statement('ALTER TABLE risk_alerts DROP CONSTRAINT IF EXISTS risk_alerts_status_check');
            DB::statement("ALTER TABLE risk_alerts ADD CONSTRAINT risk_alerts_status_check CHECK (status IN ('pending', 'reviewed', 'escalated', 'resolved'))");
        }
    }

    public function down(): void
    {
        Schema::table('risk_alerts', function (Blueprint $table) {
            $table->dropColumn('notes');
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE risk_alerts DROP CONSTRAINT IF EXISTS risk_alerts_status_check');
        }
    }
};
