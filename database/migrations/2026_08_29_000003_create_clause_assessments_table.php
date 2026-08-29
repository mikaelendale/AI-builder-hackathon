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
        Schema::create('clause_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('interview_id')->constrained()->cascadeOnDelete();
            $table->enum('clause_key', [
                'age_15_plus',
                'hours_threshold',
                'min_wage',
                'no_child_labor',
                'no_forced_labor',
                'no_discrimination',
                'freedom_of_association',
            ]);
            $table->enum('status', ['met', 'not_met', 'unclear']);
            $table->decimal('confidence', 3, 2); // 0.00–1.00
            $table->text('evidence_quote')->nullable();
            $table->json('raw_llm_output')->nullable();
            $table->json('sdg_tags')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clause_assessments');
    }
};
