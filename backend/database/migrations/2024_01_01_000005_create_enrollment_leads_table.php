<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrollment_leads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->enum('status', ['inquiry', 'tour_scheduled', 'application_sent', 'enrolled', 'lost'])->default('inquiry');
            $table->string('source_campaign')->nullable();
            $table->text('notes')->nullable();
            $table->foreignUuid('assigned_counselor_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('last_contacted_at')->nullable();
            $table->timestamp('enrolled_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('source_campaign');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollment_leads');
    }
};