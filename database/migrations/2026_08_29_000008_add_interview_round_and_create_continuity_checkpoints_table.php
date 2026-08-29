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
        Schema::table('interviews', function (Blueprint $table) {
            $table->unsignedInteger('interview_round')->default(1)->after('beneficiary_id');
        });

        Schema::create('continuity_checkpoints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('beneficiary_id')->constrained()->cascadeOnDelete();
            $table->foreignId('interview_id')->constrained()->cascadeOnDelete();
            $table->date('checkpoint_date');
            $table->boolean('still_employed_same_role');
            $table->unsignedInteger('cumulative_weeks_employed')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('continuity_checkpoints');

        Schema::table('interviews', function (Blueprint $table) {
            $table->dropColumn('interview_round');
        });
    }
};
