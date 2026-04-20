<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            // Make dob nullable so date_of_birth can be used for API (dob stays for internal use)
            $table->date('dob')->nullable()->change();
            // Direct section assignment (sections are primarily assigned via section_student pivot;
            // this column allows a "home section" for enrollment tracking)
            $table->foreignUuid('section_id')
                ->nullable()
                ->after('household_id')
                ->constrained('sections')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->date('dob')->nullable(false)->change();
            $table->dropForeign(['section_id']);
            $table->dropColumn('section_id');
        });
    }
};
