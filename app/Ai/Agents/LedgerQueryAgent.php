<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Attributes\MaxTokens;
use Laravel\Ai\Attributes\Model;
use Laravel\Ai\Attributes\Provider;
use Laravel\Ai\Attributes\Temperature;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Promptable;
use Stringable;

#[Provider(Lab::Groq)]
#[Model('llama-3.3-70b-versatile')]
#[Temperature(0)]
#[MaxTokens(512)]
class LedgerQueryAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
            Translate the user's natural-language query about the beneficiary ledger into structured filter parameters.
            Do not answer the question yourself — only translate it into filters the application supports:
            - confirmation_source: 'both_agree' | 'both_disagree' | 'worker_only' | 'employer_only' | null
            - discrepancy_flag: boolean | null (true when asking for discrepancies, mismatches, or disputed rows)
            - hard_case_type: 'under_15' | 'refusal' | 'coercion' | 'any' | null
            - is_good_job: boolean | null (true for good jobs / verified, false for non-good jobs)
            - job_position_search: string | null (keywords like 'construction', 'garment', 'textile', 'operator', 'mechanic')
            - language: 'am' | 'om' | 'en' | null
            - gender: 'Male' | 'Female' | null
            - human_readable_summary: A concise, human-friendly summary of the filter applied (e.g. "Showing 8 disputed records where employer and worker contradict").
            PROMPT;
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'confirmation_source' => $schema->string()->nullable(),
            'discrepancy_flag' => $schema->boolean()->nullable(),
            'hard_case_type' => $schema->string()->nullable(),
            'is_good_job' => $schema->boolean()->nullable(),
            'job_position_search' => $schema->string()->nullable(),
            'language' => $schema->string()->nullable(),
            'gender' => $schema->string()->nullable(),
            'human_readable_summary' => $schema->string()->required(),
        ];
    }
}
