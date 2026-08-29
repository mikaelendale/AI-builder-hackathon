<?php

namespace App\Http\Controllers;

use App\Models\EmployerConfirmation;
use App\Services\SheetAggregator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmployerConfirmationController extends Controller
{
    public function show(string $token): Response
    {
        $confirmation = EmployerConfirmation::with(['interview.beneficiary', 'interview.sheetRow'])
            ->where('confirmation_token', $token)
            ->firstOrFail();

        $isExpired = now()->gt($confirmation->expires_at);
        $sheetRow = $confirmation->interview->sheetRow;

        return Inertia::render('employer-confirm', [
            'confirmation' => [
                'token' => $confirmation->confirmation_token,
                'status' => $confirmation->status,
                'hours_per_week' => $confirmation->employer_reported_hours_per_week,
                'months_employed' => $confirmation->employer_reported_months_employed,
                'note' => $confirmation->employer_note,
                'expires_at' => $confirmation->expires_at->toIso8601String(),
                'is_expired' => $isExpired,
                'responded_at' => $confirmation->responded_at?->toIso8601String(),
            ],
            'job_position' => $sheetRow?->job_position ?? 'General Worker / Daily Labourer',
            'interview_id' => $confirmation->interview_id,
        ]);
    }

    public function store(Request $request, string $token)
    {
        $confirmation = EmployerConfirmation::with(['interview.clauseAssessments', 'interview.sheetRow'])
            ->where('confirmation_token', $token)
            ->firstOrFail();

        if (now()->gt($confirmation->expires_at)) {
            return back()->withErrors(['error' => 'This confirmation link has expired (72-hour window elapsed).']);
        }

        $validated = $request->validate([
            'status' => 'required|in:confirmed,disputed',
            'employer_reported_hours_per_week' => 'required|integer|min:0|max:168',
            'employer_reported_months_employed' => 'required|integer|min:0|max:120',
            'employer_note' => 'nullable|string|max:1000',
        ]);

        $confirmation->update([
            'status' => $validated['status'],
            'employer_reported_hours_per_week' => $validated['employer_reported_hours_per_week'],
            'employer_reported_months_employed' => $validated['employer_reported_months_employed'],
            'employer_note' => $validated['employer_note'] ?? null,
            'responded_at' => now(),
        ]);

        // Re-run SheetAggregator to reconcile bilateral confirmation
        $aggregator = app(SheetAggregator::class);
        $aggregator->aggregate($confirmation->interview, [
            'employer_reported_hours_per_week' => $validated['employer_reported_hours_per_week'],
            'employer_reported_months_employed' => $validated['employer_reported_months_employed'],
            'confirmed_at' => now(),
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Employer confirmation recorded and reconciled successfully.',
            ]);
        }

        return redirect()->back()->with('success', 'Thank you. Your confirmation has been submitted and reconciled with the programme records.');
    }
}
