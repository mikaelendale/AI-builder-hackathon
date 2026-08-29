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
        Schema::create('sheet_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('interview_id')->constrained()->cascadeOnDelete();
            $table->string('job_position')->nullable();
            $table->string('gender')->nullable();
            $table->string('age_band')->nullable();
            $table->unsignedInteger('monthly_salary_etb')->nullable();
            $table->boolean('is_good_job'); // computed from all 7 clause_assessments
            $table->unsignedInteger('employer_reported_value')->nullable();
            $table->unsignedInteger('worker_reported_value')->nullable();
            $table->boolean('discrepancy_flag')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sheet_rows');
    }
};
