<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('risk_alerts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->uuid('counselor_id')->nullable();
            $table->decimal('attendance_rate', 5, 2);
            $table->decimal('grade_drop_percentage', 5, 2);
            $table->jsonb('risk_factors');
            $table->enum('status', ['pending', 'reviewed', 'escalated'])->default('pending');
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->foreign('counselor_id')->references('id')->on('users')->onDelete('set null');

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('risk_alerts');
    }
};