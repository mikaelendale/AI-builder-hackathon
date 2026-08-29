<?php

use App\Http\Controllers\AudioController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InterviewController;
use Illuminate\Support\Facades\Route;

Route::get('/', [DashboardController::class, 'index'])->name('home');
Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

Route::get('/interview', [InterviewController::class, 'create'])->name('interview.create');
Route::get('/interviews/{interview}', [InterviewController::class, 'show'])->name('interview.show');
Route::post('/beneficiaries/{beneficiary}/interviews', [InterviewController::class, 'start'])->name('interview.start');
Route::post('/interviews/{interview}/transcript', [InterviewController::class, 'submitTranscript'])->name('interview.transcript');
Route::post('/interviews/{interview}/complete', [InterviewController::class, 'complete'])->name('interview.complete');
Route::post('/api/audio/transcribe', [AudioController::class, 'transcribe'])->name('audio.transcribe');

require __DIR__.'/settings.php';
