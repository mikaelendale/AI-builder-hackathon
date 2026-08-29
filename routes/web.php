<?php

use App\Http\Controllers\AudioController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployerConfirmationController;
use App\Http\Controllers\InterviewController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [DashboardController::class, 'index'])->name('home');
Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
Route::get('/dashboard/evidence-pack', [DashboardController::class, 'exportEvidencePack'])->name('dashboard.evidence-pack');

Route::get('/interview', [InterviewController::class, 'create'])->name('interview.create');
Route::get('/interviews/{interview}', [InterviewController::class, 'show'])->name('interview.show');
Route::post('/beneficiaries/{beneficiary}/interviews', [InterviewController::class, 'start'])->name('interview.start');
Route::post('/interviews/{interview}/transcript', [InterviewController::class, 'submitTranscript'])->name('interview.transcript');
Route::post('/interviews/{interview}/complete', [InterviewController::class, 'complete'])->name('interview.complete');

// Feature 1: Bilateral Confirmation
Route::get('/employer/confirm/{token}', [EmployerConfirmationController::class, 'show'])->name('employer.confirm.show');
Route::post('/employer/confirm/{token}', [EmployerConfirmationController::class, 'store'])->name('employer.confirm.store');

// Feature 4: Feature-Phone IVR Simulator
Route::get('/demo/feature-phone', function () {
    return Inertia::render('feature-phone-simulator');
})->name('demo.feature-phone');

Route::post('/api/audio/transcribe', [AudioController::class, 'transcribe'])->name('audio.transcribe');
Route::post('/api/audio/speak', [AudioController::class, 'speak'])->name('audio.speak');
Route::post('/api/audio/translate', [AudioController::class, 'translate'])->name('audio.translate');
Route::post('/api/audio/estimate', [AudioController::class, 'estimate'])->name('audio.estimate');

require __DIR__.'/settings.php';
