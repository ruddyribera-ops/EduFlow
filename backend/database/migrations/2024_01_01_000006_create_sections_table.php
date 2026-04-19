<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('grade_level');
            $table->string('room')->nullable();
            $table->foreignUuid('counselor_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignUuid('teacher_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('semester')->default('fall');
            $table->timestamps();

            $table->index('grade_level');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};