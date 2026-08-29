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
#[Temperature(0.1)] // low temperature — extraction, not creative writing
#[MaxTokens(2048)]
class ClauseExtractionAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
            You are extracting factual signal from a beneficiary interview transcript
            about their employment. You are NOT deciding whether they have a "good job"
            — you are only reporting what the person actually said, per topic.

            For each of the 7 topics below, extract:
            - what the person said (raw_signal): a short factual summary in your own words
            - evidence_quote: the most relevant verbatim short quote from the transcript
              supporting that summary (or null if the topic was not addressed at all)
            - your own confidence (0.0–1.0) that you understood what they said correctly
              — NOT confidence about whether the clause is met. If the transcript is
              vague, contradictory, or the person clearly didn't understand the question,
              confidence should be low.

            Topics:
            1. age — their stated age or age-revealing details
            2. hours_and_duration — how many hours/week or how long they've worked, and
               any ambiguity in how they express duration (e.g. relative time like
               "after the rains")
            3. wage — what they are paid, how often, in what form (cash/bank/etc)
            4. child_labor — anything relevant to their age at start of work or
               conditions suggesting child labor
            5. forced_labor — anything suggesting coercion, inability to leave, or
               free consent to the work
            6. discrimination — anything suggesting unequal treatment
            7. freedom_of_association — anything about ability to join groups/unions
               or organize with coworkers

            Do not guess or fill in gaps. If a topic was not discussed, say so plainly
            and use a low confidence value. Never state a conclusion the transcript
            does not support.
            PROMPT;
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
            'child_labor' => $topic(),
            'forced_labor' => $topic(),
            'discrimination' => $topic(),
            'freedom_of_association' => $topic(),
            'needs_followup_on' => $schema->array()
                ->items($schema->string())
                ->required(), // list of topic keys the agent thinks need a follow-up question
        ];
    }
}
