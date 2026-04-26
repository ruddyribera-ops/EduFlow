<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parent_meetings', function (Blueprint $table) {
            $table->uuid('created_by_user_id')->nullable();
            $table->uuid('updated_by_user_id')->nullable();

            $table->foreign('created_by_user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('updated_by_user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('parent_meetings', function (Blueprint $table) {
            $table->dropForeign(['created_by_user_id']);
            $table->dropForeign(['updated_by_user_id']);
            $table->dropColumn(['created_by_user_id', 'updated_by_user_id']);
        });
    }
};