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
class RightsProtectionsAgent implements Agent, CanActAsTool, HasStructuredOutput
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
            Extract statutory rights and protection signals from this interview transcript:
            1. child_labor: evidence regarding age at start of work or underage conditions.
            2. forced_labor: evidence regarding coercion, inability to leave, document retention, or free consent.
            3. discrimination: evidence regarding unequal treatment, harassment, or biased conditions.
            4. freedom_of_association: evidence regarding worker representation, union participation, or collective organizing.

            Note: In natural speech, rights protections are often established by the ABSENCE of a problem.
            Extract what is implied as well as what is explicit, but keep confidence low (or note ambiguity)
            when the transcript is unclear. Do not make legal verdicts; only report the factual signal.
            PROMPT;
    }

    public function name(): string
    {
        return 'rights_protections_extractor';
    }

    public function description(): string
    {
        return 'Extracts child labor, forced labor, discrimination, and freedom of association signals from an interview transcript. Pass the full transcript text as the task.';
    }

    public function schema(JsonSchema $schema): array
    {
        $topic = fn () => $schema->object(fn ($s) => [
            'raw_signal' => $s->string()->required(),
            'evidence_quote' => $s->string()->nullable(),
            'confidence' => $s->number()->min(0)->max(1)->required(),
        ])->required();

        return [
            'child_labor' => $topic(),
            'forced_labor' => $topic(),
            'discrimination' => $topic(),
            'freedom_of_association' => $topic(),
        ];
    }
}
