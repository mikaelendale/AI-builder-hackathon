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
        Schema::table('clause_assessments', function (Blueprint $table) {
            $table->boolean('verifier_flag')->nullable()->after('confidence');
            $table->text('verifier_note')->nullable()->after('verifier_flag');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clause_assessments', function (Blueprint $table) {
            $table->dropColumn(['verifier_flag', 'verifier_note']);
        });
    }
};
