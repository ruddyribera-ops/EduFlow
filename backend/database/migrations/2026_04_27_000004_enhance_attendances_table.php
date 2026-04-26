<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->uuid('marked_by_user_id')->nullable()->after('notes');
            $table->timestamp('marked_at')->nullable()->after('marked_by_user_id');
            $table->text('notes')->nullable()->change(); // already exists, just make sure it's text

            $table->foreign('marked_by_user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');

            $table->index('marked_by_user_id');
            $table->index('marked_at');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropForeign(['marked_by_user_id']);
            $table->dropColumn(['marked_by_user_id', 'marked_at']);
        });
    }
};