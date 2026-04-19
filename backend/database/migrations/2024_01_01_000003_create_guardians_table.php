<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guardians', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('passwordless_login_token', 64)->nullable()->unique();
            $table->timestamp('passwordless_token_expires_at')->nullable();
            $table->enum('communication_preference', ['email_only', 'sms_only', 'both'])->default('both');
            $table->uuid('household_id')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index('household_id');
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guardians');
    }
};