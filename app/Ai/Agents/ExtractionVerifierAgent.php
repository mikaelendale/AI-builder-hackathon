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
#[Temperature(0)] // deterministic checking, not generation
#[MaxTokens(1536)]
class ExtractionVerifierAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
            You are a fact-checker, not an interviewer. You will be given the original
            transcript and a set of extracted claims (raw_signal + evidence_quote per
            topic). For each claim, verify:
            1. Does the evidence_quote actually appear in (or accurately paraphrase)
               the transcript? Flag if it looks fabricated or doesn't match.
            2. Does the raw_signal accurately represent what the evidence_quote says,
               without adding unstated inferences?

            You are NOT re-deciding what the person meant, and you are NOT applying
            any legal threshold. You are only checking whether the extraction is
            faithful to the source text. Be strict — if a quote is paraphrased loosely
            or a claim goes beyond what the transcript actually supports, flag it.
            PROMPT;
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'verifications' => $schema->array()->items(
                $schema->object(fn ($s) => [
                    'topic_key' => $s->string()->required(),
                    'is_faithful' => $s->boolean()->required(),
                    'note' => $s->string()->nullable(), // required when is_faithful is false
                ])
            )->required(),
        ];
    }
}
