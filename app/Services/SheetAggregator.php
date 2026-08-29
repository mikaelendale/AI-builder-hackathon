<?php

namespace App\Services;

use App\Models\Interview;
use App\Models\SheetRow;

class SheetAggregator
{
    public function aggregate(Interview $interview, array $attributes = []): SheetRow
    {
        $assessments = $interview->clauseAssessments;
        $isGoodJob = $assessments->count() === 7
            && $assessments->every(fn ($a) => $a->status === 'met');

        $row = $interview->sheetRow;

        $employerReported = $attributes['employer_reported_value'] 
            ?? $row?->employer_reported_value 
            ?? 1; // 1 = good job claimed by employer

        $workerReported = $attributes['worker_reported_value'] 
            ?? $row?->worker_reported_value 
            ?? ($isGoodJob ? 1 : 0);

        $hasDiscrepancy = $employerReported !== $workerReported;

        return SheetRow::updateOrCreate(
            ['interview_id' => $interview->id],
            [
                'job_position' => $attributes['job_position'] ?? $row?->job_position ?? 'General Worker',
                'gender' => $attributes['gender'] ?? $row?->gender ?? 'Unspecified',
                'age_band' => $attributes['age_band'] ?? $row?->age_band ?? '15-24',
                'monthly_salary_etb' => $attributes['monthly_salary_etb'] ?? $row?->monthly_salary_etb,
                'is_good_job' => $isGoodJob,
                'employer_reported_value' => $employerReported,
                'worker_reported_value' => $workerReported,
                'discrepancy_flag' => $hasDiscrepancy,
            ]
        );
    }
}
