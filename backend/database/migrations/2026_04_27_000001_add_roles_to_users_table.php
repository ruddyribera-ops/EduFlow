<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify users table
        Schema::table('users', function (Blueprint $table) {
            // Change role to enum with new values
            $table->enum('role', [
                'admin',
                'director',
                'coordinator',
                'receptionist',
                'teacher',
                'counselor',
                'guardian',
            ])->default('guardian')->change();

            // Add department column
            $table->string('department')->nullable()->after('role');

            // Add assigned_sections column
            $table->json('assigned_sections')->nullable()->after('department');
        });

        // Modify sections table
        Schema::table('sections', function (Blueprint $table) {
            // Add start_time and end_time columns
            $table->time('start_time')->nullable()->after('name');
            $table->time('end_time')->nullable()->after('start_time');

            // Add room_number column
            $table->string('room_number')->nullable()->after('end_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert sections table changes
        Schema::table('sections', function (Blueprint $table) {
            $table->dropColumn(['start_time', 'end_time', 'room_number']);
        });

        // Revert users table changes
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['assigned_sections', 'department']);

            // Revert role back to string
            $table->string('role')->default('guardian')->change();
        });
    }
};
