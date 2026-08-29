<?php

namespace App\Services;

use App\Models\SheetRow;
use Illuminate\Support\Str;

class EvidencePackGenerator
{
    public function generate(): array
    {
        $rows = SheetRow::with(['interview.clauseAssessments', 'interview.hardCaseFlags'])->get();

        $records = $rows->map(fn (SheetRow $row) => [
            'record_id' => Str::uuid()->toString(), // Anonymized, not beneficiary_id
            'job_position' => $row->job_position,
            'gender' => $row->gender,
            'age_band' => $row->age_band,
            'is_good_job' => $row->is_good_job,
            'confirmation_source' => $row->confirmation_source ?? 'unconfirmed',
            'clause_verdicts' => $row->interview?->clauseAssessments?->mapWithKeys(
                fn ($a) => [$a->clause_key => ['status' => $a->status, 'confidence' => (float) $a->confidence]]
            ) ?? [],
            // Deliberately excluded: beneficiary name, transcript text, evidence quotes
        ])->values()->toArray();

        $summary = [
            'programme' => 'sequa Ethiopia — Sustainable Industrial Clusters Programme (SICP)',
            'challenge' => 'AI Builder Challenge 3 (Direct Beneficiary Verification)',
            'total_records' => count($records),
            'good_jobs' => collect($records)->where('is_good_job', true)->count(),
            'discrepancies_found' => $rows->where('discrepancy_flag', true)->count(),
            'generated_at' => now()->toIso8601String(),
        ];

        $payload = ['summary' => $summary, 'records' => $records];
        $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE);

        // Hash chain: each record's hash includes the previous record's hash,
        // so altering any single record breaks every subsequent hash.
        $chainHash = hash('sha256', '');
        $chained = collect($records)->map(function ($record) use (&$chainHash) {
            $chainHash = hash('sha256', $chainHash . json_encode($record, JSON_UNESCAPED_UNICODE));
            return array_merge($record, ['chain_hash' => $chainHash]);
        })->toArray();

        $appKey = config('app.key') ?: 'sequa-ethiopia-hackathon-2026-secret-key';
        $signature = hash_hmac('sha256', $payloadJson, $appKey);

        return [
            'summary' => $summary,
            'records' => $chained,
            'final_chain_hash' => $chainHash,
            'signature' => $signature,
            'signature_algorithm' => 'HMAC-SHA256',
            'verification_note' => 'To verify: recompute the chain hash over records in order, then HMAC the summary+records payload with the app key and compare to `signature`.',
        ];
    }
}
