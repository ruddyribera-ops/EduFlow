<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('section_student', function (Blueprint $table) {
            $table->uuid('section_id');
            $table->uuid('student_id');
            $table->timestamps();

            $table->foreign('section_id')->references('id')->on('sections')->onDelete('cascade');
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->primary(['section_id', 'student_id']);
        });

        Schema::create('section_teacher', function (Blueprint $table) {
            $table->uuid('section_id')->nullable(false);
            $table->uuid('teacher_id')->nullable(false);
            $table->timestamps();

            $table->foreign('section_id')->references('id')->on('sections')->onDelete('cascade');
            $table->foreign('teacher_id')->references('id')->on('users')->onDelete('cascade');
            $table->primary(['section_id', 'teacher_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('section_student');
        Schema::dropIfExists('section_teacher');
    }
};