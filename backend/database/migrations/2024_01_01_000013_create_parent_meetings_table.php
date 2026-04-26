<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parent_meetings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->date('meeting_date');
            $table->string('tutor_name')->nullable();
            $table->string('day_time')->nullable();
            $table->string('attendees')->nullable();
            $table->string('modality')->nullable();
            $table->string('confirmation')->nullable();
            $table->text('observation')->nullable();
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->index('meeting_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parent_meetings');
    }
};
