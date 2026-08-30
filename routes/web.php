<?php

use App\Http\Controllers\AudioController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployerConfirmationController;
use App\Http\Controllers\InterviewController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [DashboardController::class, 'index'])->name('home');
Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
Route::post('/dashboard/query', [DashboardController::class, 'query'])->name('dashboard.query');
Route::get('/dashboard/evidence-pack', [DashboardController::class, 'exportEvidencePack'])->name('dashboard.evidence-pack');

Route::get('/interview', [InterviewController::class, 'create'])->name('interview.create');
Route::get('/interviews/{interview}', [InterviewController::class, 'show'])->name('interview.show');
Route::get('/interviews/{interview}/trace', [InterviewController::class, 'trace'])->name('interview.trace');
Route::post('/beneficiaries/{beneficiary}/interviews', [InterviewController::class, 'start'])->name('interview.start');
Route::post('/beneficiaries/quick-create', [InterviewController::class, 'quickCreateBeneficiary'])->name('beneficiary.quick-create');
Route::post('/interviews/{interview}/transcript', [InterviewController::class, 'submitTranscript'])->name('interview.transcript');
Route::post('/interviews/{interview}/converse', [InterviewController::class, 'converse'])->name('interview.converse');
Route::post('/interviews/{interview}/complete', [InterviewController::class, 'complete'])->name('interview.complete');

// Feature 1: Bilateral Confirmation
Route::get('/employer/confirm/{token}', [EmployerConfirmationController::class, 'show'])->name('employer.confirm.show');
Route::post('/employer/confirm/{token}', [EmployerConfirmationController::class, 'store'])->name('employer.confirm.store');

// Feature 4: Feature-Phone IVR Simulator
Route::get('/demo/feature-phone', function () {
    $beneficiary = \App\Models\Beneficiary::where('persona_type', 'abel')->first()
        ?? \App\Models\Beneficiary::firstOrCreate([
            'name' => 'Abel Kebede',
            'persona_type' => 'abel',
            'phone_type' => 'feature_phone',
            'language' => 'am',
        ]);

    $interview = \App\Models\Interview::where('beneficiary_id', $beneficiary->id)
        ->latest()
        ->first();

    if (! $interview) {
        $interview = \App\Models\Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'in_progress',
            'consent_given' => true,
            'started_at' => now(),
        ]);
    }

    return Inertia::render('feature-phone-simulator', [
        'interview' => $interview->load(['beneficiary', 'clauseAssessments']),
        'beneficiary' => $beneficiary,
    ]);
})->name('demo.feature-phone');

Route::post('/api/audio/transcribe', [AudioController::class, 'transcribe'])->name('audio.transcribe');
Route::post('/api/audio/speak', [AudioController::class, 'speak'])->name('audio.speak');
Route::post('/api/audio/translate', [AudioController::class, 'translate'])->name('audio.translate');
Route::post('/api/audio/estimate', [AudioController::class, 'estimate'])->name('audio.estimate');

require __DIR__.'/settings.php';
