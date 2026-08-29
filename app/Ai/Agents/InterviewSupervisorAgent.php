<?php

namespace App\Ai\Agents;

use Laravel\Ai\Attributes\MaxTokens;
use Laravel\Ai\Attributes\Model;
use Laravel\Ai\Attributes\Provider;
use Laravel\Ai\Attributes\Temperature;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Promptable;
use Stringable;

#[Provider(Lab::Groq)]
#[Model('llama-3.3-70b-versatile')]
#[Temperature(0.1)]
#[MaxTokens(2048)]
class InterviewSupervisorAgent implements Agent, HasTools
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
            You coordinate two specialist extraction tools over a single interview
            transcript: employment_facts_extractor and rights_protections_extractor.
            Call BOTH tools with the full transcript. Do not summarize or alter their
            output — return both results as-is so they can be merged downstream.
            PROMPT;
    }

    public function tools(): iterable
    {
        return [
            new EmploymentFactsAgent,
            new RightsProtectionsAgent,
        ];
    }
}
