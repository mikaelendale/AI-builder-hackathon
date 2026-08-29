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
        Schema::create('employer_confirmations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('interview_id')->constrained()->cascadeOnDelete();
            $table->string('confirmation_token', 64)->unique();
            $table->enum('status', ['pending', 'confirmed', 'disputed', 'expired'])
                ->default('pending');
            $table->unsignedInteger('employer_reported_hours_per_week')->nullable();
            $table->unsignedInteger('employer_reported_months_employed')->nullable();
            $table->text('employer_note')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employer_confirmations');
    }
};
