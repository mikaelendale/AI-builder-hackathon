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
        Schema::create('beneficiaries', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('persona_type')->default('synthetic'); // 'selam' | 'abel' | 'almaz' | 'synthetic'
            $table->enum('phone_type', ['smartphone', 'feature_phone']);
            $table->string('language'); // 'en' | 'am' | 'om'
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('beneficiaries');
    }
};
