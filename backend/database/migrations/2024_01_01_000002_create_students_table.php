<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('first_name');
            $table->string('last_name');
            $table->date('dob');
            $table->enum('enrollment_status', ['inquiry', 'applied', 'accepted', 'enrolled', 'withdrawn', 'graduated'])
                  ->default('inquiry');
            $table->string('grade_level');
            $table->uuid('household_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['enrollment_status', 'grade_level']);
            $table->index('household_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};