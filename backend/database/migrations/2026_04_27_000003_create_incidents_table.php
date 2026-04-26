<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incidents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->uuid('reported_by_user_id');
            $table->enum('type', ['medical', 'behavioral', 'late_arrival', 'early_dismissal', 'visitor', 'other'])
                  ->default('other');
            $table->enum('severity', ['low', 'medium', 'high'])
                  ->default('medium');
            $table->text('description')->nullable();
            $table->timestamp('occurred_at')->nullable();
            $table->timestamp('resolved_at')->nullable()->comment('When incident was resolved');
            $table->uuid('resolved_by_user_id')->nullable()->comment('Who resolved it');
            $table->text('resolution_notes')->nullable()->comment('How it was resolved');
            $table->boolean('notify_coordinator')->default(true)->comment('Alert coordinator on creation');
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->foreign('reported_by_user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('resolved_by_user_id')->references('id')->on('users')->onDelete('set null');

            $table->index('student_id');
            $table->index('reported_by_user_id');
            $table->index('type');
            $table->index('severity');
            $table->index('occurred_at');
            $table->index(['type', 'severity']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incidents');
    }
};