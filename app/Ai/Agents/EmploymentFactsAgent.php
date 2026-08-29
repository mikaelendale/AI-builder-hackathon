<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Attributes\MaxTokens;
use Laravel\Ai\Attributes\Model;
use Laravel\Ai\Attributes\Provider;
use Laravel\Ai\Attributes\Temperature;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\CanActAsTool;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Promptable;
use Stringable;

#[Provider(Lab::Groq)]
#[Model('llama-3.3-70b-versatile')]
#[Temperature(0.1)]
#[MaxTokens(1024)]
class EmploymentFactsAgent implements Agent, CanActAsTool, HasStructuredOutput
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
            Extract ONLY factual, quantitative employment details from this interview
            transcript: the person's age, their working hours/duration and any
            ambiguity in how they express it (e.g. relative time like "after the
            rains"), and their wage/pay details. Do not decide whether any legal
            threshold is met — only report what was said, with a supporting quote and
            your confidence in having understood it correctly. If a topic wasn't
            discussed, say so and use low confidence rather than guessing.
            PROMPT;
    }

    public function name(): string
    {
        return 'employment_facts_extractor';
    }

    public function description(): string
    {
        return 'Extracts age, hours/duration, and wage signal from an interview transcript. Pass the full transcript text as the task.';
    }

    public function schema(JsonSchema $schema): array
    {
        $topic = fn () => $schema->object(fn ($s) => [
            'raw_signal' => $s->string()->required(),
            'evidence_quote' => $s->string()->nullable(),
            'confidence' => $s->number()->min(0)->max(1)->required(),
        ])->required();

        return [
            'age' => $topic(),
            'hours_and_duration' => $topic(),
            'wage' => $topic(),
        ];
    }
}
