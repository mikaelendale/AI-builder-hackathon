<?php

namespace App\Services;

use App\Models\Interview;

class ClauseRuleEngine
{
    /** Confidence below this forces `unclear` regardless of what was said. */
    public const CONFIDENCE_FLOOR = 0.55;

    /** ETB legal minimum wage reference — set to 0 or unlegislated threshold */
    public const MIN_WAGE_ETB_MONTHLY = 0;

    /** Clause to SDG mapping */
    private const SDG_MAPPING = [
        'age_15_plus' => ['8.6', '8.7'],
        'hours_threshold' => ['8.5'],
        'min_wage' => ['1.2', '8.5'],
        'no_child_labor' => ['8.7'],
        'no_forced_labor' => ['8.7', '8.8'],
        'no_discrimination' => ['5.5', '8.5'],
        'freedom_of_association' => ['8.8'],
    ];

    public function evaluate(Interview $interview, array $extracted): array
    {
        return [
            'age_15_plus' => $this->evaluateAge($extracted['age'] ?? []),
            'hours_threshold' => $this->evaluateHours($extracted['hours_and_duration'] ?? []),
            'min_wage' => $this->evaluateWage($extracted['wage'] ?? []),
            'no_child_labor' => $this->evaluateChildLabor($extracted['child_labor'] ?? []),
            'no_forced_labor' => $this->evaluateForcedLabor($extracted['forced_labor'] ?? []),
            'no_discrimination' => $this->evaluateDiscrimination($extracted['discrimination'] ?? []),
            'freedom_of_association' => $this->evaluateFreedomOfAssociation($extracted['freedom_of_association'] ?? []),
        ];
    }

    private function belowConfidenceFloor(array $topic): bool
    {
        return ($topic['confidence'] ?? 0.0) < self::CONFIDENCE_FLOOR;
    }

    private function evaluateAge(array $topic): array
    {
        if ($this->belowConfidenceFloor($topic)) {
            return $this->unclear($topic, 'Age not clearly established.', 'age_15_plus');
        }

        $signal = $topic['raw_signal'] ?? '';

        if (preg_match('/\b(1[5-9]|[2-9]\d)\b/', $signal, $m)) {
            $age = (int) $m[1];

            return $age < 15
                ? $this->result('not_met', $topic, "Stated age {$age} is under 15.", 'age_15_plus')
                : $this->result('met', $topic, "Stated age {$age} meets the 15+ threshold.", 'age_15_plus');
        }

        if (preg_match('/\b([1-9]|1[0-4])\b/', $signal, $m)) {
            $age = (int) $m[1];
            return $this->result('not_met', $topic, "Stated age {$age} is under 15.", 'age_15_plus');
        }

        return $this->unclear($topic, 'Age mentioned but not extractable as a number.', 'age_15_plus');
    }

    private function evaluateHours(array $topic): array
    {
        if ($this->belowConfidenceFloor($topic)) {
            return $this->unclear($topic, 'Hours/duration ambiguous — needs follow-up.', 'hours_threshold');
        }

        $signal = $topic['raw_signal'] ?? '';

        // Weekly hours match (e.g. 40 hours per week, 25 hrs/wk)
        if (preg_match('/\b(\d+)\s*(?:hour|hr)s?\s*(?:\/|\s*per\s*)?\s*(?:week|wk)/i', $signal, $m)) {
            $hoursPerWeek = (int) $m[1];

            return $hoursPerWeek >= 20
                ? $this->result('met', $topic, "{$hoursPerWeek} hrs/week meets the 20hr/week threshold.", 'hours_threshold')
                : $this->result('not_met', $topic, "{$hoursPerWeek} hrs/week is below the 20hr/week threshold.", 'hours_threshold');
        }

        // Daily hours match e.g. "8 hours a day, 5 days a week" -> 40 hrs
        if (preg_match('/(\d+)\s*(?:hour|hr)s?\s*(?:a|per)?\s*day.*(\d+)\s*days/i', $signal, $m)) {
            $daily = (int) $m[1];
            $days = (int) $m[2];
            $total = $daily * $days;

            return $total >= 20
                ? $this->result('met', $topic, "{$total} hrs/week ({$daily}h/day x {$days}d) meets threshold.", 'hours_threshold')
                : $this->result('not_met', $topic, "{$total} hrs/week is below the 20hr/week threshold.", 'hours_threshold');
        }

        return $this->unclear($topic, 'Could not extract a concrete hours/duration figure.', 'hours_threshold');
    }

    private function evaluateWage(array $topic): array
    {
        if ($this->belowConfidenceFloor($topic) || self::MIN_WAGE_ETB_MONTHLY === 0) {
            return $this->unclear($topic, 'Wage figure or legal minimum reference not established.', 'min_wage');
        }

        $signal = $topic['raw_signal'] ?? '';

        if (preg_match('/(\d{2,6})\s*(etb|birr)/i', $signal, $m)) {
            $wage = (int) $m[1];

            return $wage >= self::MIN_WAGE_ETB_MONTHLY
                ? $this->result('met', $topic, "Reported wage {$wage} ETB meets minimum wage threshold.", 'min_wage')
                : $this->result('not_met', $topic, "Reported wage {$wage} ETB is below minimum wage threshold.", 'min_wage');
        }

        return $this->unclear($topic, 'Wage amount not clearly stated.', 'min_wage');
    }

    private function evaluateChildLabor(array $topic): array
    {
        if ($this->belowConfidenceFloor($topic)) {
            return $this->unclear($topic, 'Insufficient signal on child labour.', 'no_child_labor');
        }

        $signal = strtolower($topic['raw_signal'] ?? '');
        $violationKeywords = ['child labor', 'underage', 'started at 12', 'started at 13', 'started at 14', 'minor work'];
        foreach ($violationKeywords as $kw) {
            if (str_contains($signal, $kw)) {
                return $this->result('not_met', $topic, 'Evidence of minor/child labour indicated.', 'no_child_labor');
            }
        }

        return $this->result('met', $topic, 'No child labour indicators found.', 'no_child_labor');
    }

    private function evaluateForcedLabor(array $topic): array
    {
        if ($this->belowConfidenceFloor($topic)) {
            return $this->unclear($topic, 'Insufficient signal on forced labour.', 'no_forced_labor');
        }

        $signal = strtolower($topic['raw_signal'] ?? '');
        $violationKeywords = ['forced', 'cannot leave', 'locked', 'coerced', 'threatened', 'withheld documents', 'trapped'];
        foreach ($violationKeywords as $kw) {
            if (str_contains($signal, $kw)) {
                return $this->result('not_met', $topic, 'Signal indicates forced or involuntary conditions.', 'no_forced_labor');
            }
        }

        return $this->result('met', $topic, 'Voluntary employment with freedom of movement.', 'no_forced_labor');
    }

    private function evaluateDiscrimination(array $topic): array
    {
        if ($this->belowConfidenceFloor($topic)) {
            return $this->unclear($topic, 'Insufficient signal on non-discrimination.', 'no_discrimination');
        }

        $signal = strtolower($topic['raw_signal'] ?? '');
        $violationKeywords = ['discrim', 'unequal pay', 'harass', 'unfair treatment', 'gender bias'];
        $cleanKeywords = ['no discrimination', 'treated same', 'equal', 'fair', 'no problem', 'treated equally'];

        foreach ($cleanKeywords as $kw) {
            if (str_contains($signal, $kw)) {
                return $this->result('met', $topic, 'Equal and non-discriminatory treatment reported.', 'no_discrimination');
            }
        }

        foreach ($violationKeywords as $kw) {
            if (str_contains($signal, $kw)) {
                return $this->result('not_met', $topic, 'Evidence of discrimination or harassment present.', 'no_discrimination');
            }
        }

        return $this->result('met', $topic, 'No discrimination reported.', 'no_discrimination');
    }

    private function evaluateFreedomOfAssociation(array $topic): array
    {
        if ($this->belowConfidenceFloor($topic)) {
            return $this->unclear($topic, 'Insufficient signal on freedom of association.', 'freedom_of_association');
        }

        $signal = strtolower($topic['raw_signal'] ?? '');
        $deniedKeywords = ['not allowed', 'banned', 'prohibited', 'denied', 'no union allowed', 'forbidden'];
        $allowedKeywords = ['free to join', 'allowed', 'can join', 'union', 'association', 'permitted', 'yes', 'group'];

        foreach ($deniedKeywords as $kw) {
            if (str_contains($signal, $kw)) {
                return $this->result('not_met', $topic, 'Worker indicates union/association rights denied.', 'freedom_of_association');
            }
        }

        foreach ($allowedKeywords as $kw) {
            if (str_contains($signal, $kw)) {
                return $this->result('met', $topic, 'Worker has freedom to associate and join groups.', 'freedom_of_association');
            }
        }

        return $this->unclear($topic, 'Freedom of association status unclear.', 'freedom_of_association');
    }

    private function result(string $status, array $topic, string $reason, string $clauseKey): array
    {
        return [
            'status' => $status,
            'confidence' => $topic['confidence'] ?? 0.0,
            'evidence_quote' => $topic['evidence_quote'] ?? null,
            'reason' => $reason,
            'sdg_tags' => self::SDG_MAPPING[$clauseKey] ?? [],
        ];
    }

    private function unclear(array $topic, string $reason, string $clauseKey): array
    {
        return $this->result('unclear', $topic, $reason, $clauseKey);
    }

    /**
     * Resolve the hours_threshold clause using BOTH sources when available, per the
     * brief's "confirmed either by employer or worker" rule. This does not replace
     * evaluateHours() — it runs AFTER it, using the worker verdict as one input.
     */
    public function reconcile(
        array $workerVerdict,
        ?int $employerHoursPerWeek,
        ?int $employerMonthsEmployed
    ): array {
        // Case 1: no employer data at all — worker's verdict stands alone, valid per brief
        if ($employerHoursPerWeek === null) {
            return [
                'final_status' => $workerVerdict['status'] ?? 'unclear',
                'source' => 'worker_only',
                'note' => 'No employer confirmation received; worker statement accepted alone per programme rules.',
            ];
        }

        $employerMeets = $employerHoursPerWeek >= 20 && ($employerMonthsEmployed ?? 0) >= 6;
        $employerStatus = $employerMeets ? 'met' : 'not_met';
        $workerStatus = $workerVerdict['status'] ?? 'unclear';

        // Case 2: worker was unclear, employer gives a clean confirmation — employer
        // confirmation resolves the clause per the brief's "either" rule
        if ($workerStatus === 'unclear') {
            return [
                'final_status' => $employerStatus,
                'source' => 'employer_only',
                'note' => 'Worker account was ambiguous; resolved using employer confirmation.',
            ];
        }

        // Case 3: both parties gave a clear answer and they agree
        if ($workerStatus === $employerStatus) {
            return [
                'final_status' => $workerStatus,
                'source' => 'both_agree',
                'note' => 'Worker and employer accounts agree.',
            ];
        }

        // Case 4: both gave clear answers and they DISAGREE — this is a hard case,
        // never silently pick one side
        return [
            'final_status' => 'unclear',
            'source' => 'both_disagree',
            'note' => "Worker reported {$workerStatus}, employer reported {$employerStatus} — contradiction requires a field visit.",
        ];
    }

    /**
     * Evaluate longitudinal continuity across multiple interview checkpoints.
     */
    public function evaluateContinuity(\Illuminate\Support\Collection $checkpoints): array
    {
        if ($checkpoints->count() < 2) {
            return ['status' => 'unclear', 'reason' => 'Single interview — continuity not yet established, re-check needed.'];
        }

        $allConfirmed = $checkpoints->every(fn ($c) => (bool) $c->still_employed_same_role);
        $totalWeeks = $checkpoints->max('cumulative_weeks_employed') ?? 0;

        if (! $allConfirmed) {
            return ['status' => 'not_met', 'reason' => 'Employment was not continuous across checkpoints.'];
        }

        return $totalWeeks >= 26
            ? ['status' => 'met', 'reason' => "Confirmed continuous employment across {$totalWeeks} weeks."]
            : ['status' => 'unclear', 'reason' => "Only {$totalWeeks} of 26 required weeks confirmed so far — needs another checkpoint."];
    }
}
