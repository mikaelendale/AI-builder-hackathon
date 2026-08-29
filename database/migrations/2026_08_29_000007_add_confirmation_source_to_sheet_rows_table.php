<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sheet_rows', function (Blueprint $table) {
            $table->enum('confirmation_source', ['worker_only', 'employer_only', 'both_agree', 'both_disagree', 'unconfirmed'])
                ->default('unconfirmed')->after('discrepancy_flag');
            $table->timestamp('confirmed_at')->nullable()->after('confirmation_source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sheet_rows', function (Blueprint $table) {
            $table->dropColumn(['confirmation_source', 'confirmed_at']);
        });
    }
};
