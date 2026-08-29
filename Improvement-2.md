# Improvement-2.md
## Multi-agent harness upgrade — supervisor-worker fan-out + verifier-critic reflection

Read BUILD_CONTEXT.md, IMPLEMENTATION.md, and Improvement-1.md first. This document
does NOT replace the single-agent extraction pipeline you already have working and
tested (61 tests passing) — it restructures it into a small, defensible multi-agent
system using patterns that are the current production standard, not novelty for its
own sake. Every addition here exists because it makes the app *more correct*, not
because "multi-agent" sounds impressive.

## Why these two patterns, not others

Current industry guidance (2026) is explicit: match orchestration complexity to the
task, don't over-engineer. A 5+ agent swarm or debate pattern would be indefensible in
a 5-minute pitch and adds latency/cost risk this late in the build. Two patterns
actually fit this problem:

1. **Supervisor-worker fan-out** — your single `ClauseExtractionAgent` currently
   extracts all 7 clauses in one call. Splitting it into 2 parallel specialist workers
   is a legitimate correctness improvement (a focused prompt over 3-4 topics
   extracts more reliably than one prompt spread across 7), not just architecture
   theater.
2. **Verifier-critic reflection** — a second agent that checks the first agent's
   extraction against the source transcript before it ever reaches the deterministic
   rule engine. This is the single highest-leverage addition on this list: it directly
   strengthens your core "we don't guess, we verify" pitch line with an actual second
   layer of verification, not just a claim.

Both are natively supported by the Laravel AI SDK's **Sub-Agents** feature
(`CanActAsTool`) — no new framework, no new infrastructure, this is achievable in the
time remaining.

---

## Feature 1 — Supervisor-Worker Fan-Out (split extraction into 2 specialist agents)

### Connects to
- **Replaces**: single call to `App\Ai\Agents\ClauseExtractionAgent` in
  `InterviewController::submitTranscript()`
- **New**: `App\Ai\Agents\EmploymentFactsAgent` (age, hours_and_duration, wage)
- **New**: `App\Ai\Agents\RightsProtectionsAgent` (child_labor, forced_labor,
  discrimination, freedom_of_association)
- **New**: `App\Ai\Agents\InterviewSupervisorAgent` (orchestrates the two above as
  sub-agents, per the SDK's Sub-Agents pattern)
- **Unchanged**: `App\Services\ClauseRuleEngine` — it still receives the exact same
  merged extraction shape it does today, so no downstream code changes

### Why split this way, specifically
The two groups are natural: "employment facts" are quantitative/factual (a number, a
duration, an amount) while "rights & protections" are more about detecting the
*absence* of a problem in free-form speech. Different extraction skills, different
failure modes — splitting them lets each prompt stay focused instead of doing 7
different jobs at once.

### Code

```shell
php artisan make:agent EmploymentFactsAgent --structured
php artisan make:agent RightsProtectionsAgent --structured
php artisan make:agent InterviewSupervisorAgent
```

```php
<?php
// app/Ai/Agents/EmploymentFactsAgent.php

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

#[Provider(Lab::Anthropic)]
#[Model('claude-sonnet-5')]
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
```

```php
<?php
// app/Ai/Agents/RightsProtectionsAgent.php
// Same structure as EmploymentFactsAgent — schema covers child_labor, forced_labor,
// discrimination, freedom_of_association. name(): 'rights_protections_extractor'.
// Instructions should emphasize: these are usually established by ABSENCE of a
// problem in free speech, not a direct statement — extract what's implied as well
// as what's explicit, but keep confidence low when it's genuinely ambiguous.
```

```php
<?php
// app/Ai/Agents/InterviewSupervisorAgent.php

namespace App\Ai\Agents;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Promptable;
use Stringable;

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
```

Wire into `InterviewController::submitTranscript()` — replace the single
`ClauseExtractionAgent` call:

```php
$supervisorResponse = (new InterviewSupervisorAgent)->prompt(
    "Interview transcript:\n\n{$interview->transcript_raw}"
);

// The supervisor's tool-call steps contain each sub-agent's structured output —
// extract and merge them into the same $extracted shape ClauseRuleEngine expects.
$extracted = $this->mergeSubAgentResults($supervisorResponse);
```

Add a small merge helper (private method or a new `App\Services\SubAgentResultMerger`)
that pulls the two tool results out of `$supervisorResponse->steps` (per the SDK's
tool-call step structure) and combines them into the flat 7-key array
`ClauseRuleEngine::evaluate()` already expects — **do not change `ClauseRuleEngine`
itself**, only how `$extracted` gets assembled before it's passed in.

### Demo note
This is a backend architecture change — nothing visibly different happens on Screen A
during a live demo. Say it once, briefly, in the pitch: "under the hood this isn't one
model doing seven jobs — it's a supervisor delegating to two focused specialist agents
in parallel, the same orchestrator-worker pattern production systems use." Don't spend
more than one sentence on it live; the judges' eyes are on the screen, not the
architecture diagram.

---

## Feature 2 — Verifier-Critic Reflection Loop (the highest-leverage addition here)

### Connects to
- **New**: `App\Ai\Agents\ExtractionVerifierAgent`
- **Modifies**: `InterviewController::submitTranscript()` — insert a verification step
  between extraction (Feature 1's output) and `ClauseRuleEngine::evaluate()`
- **New column**: `clause_assessments.verifier_flag` (boolean, nullable) and
  `clause_assessments.verifier_note` (text, nullable) — new migration
- **New UI element**: a small "verified" checkmark or "flagged for review" icon per
  clause badge on `interview.tsx`'s live clause grid — small addition, not a redesign

### The idea
Right now, `ClauseRuleEngine` trusts the extraction agent's `raw_signal` and
`evidence_quote` completely — if the LLM hallucinates a quote that isn't actually in
the transcript, or misreads what was said, nothing catches it before it becomes a
verdict. A verifier-critic agent closes that gap: a second, independent LLM call that
checks each extracted claim against the actual transcript text and flags anything that
doesn't hold up, BEFORE the rule engine runs.

This does not replace the rule engine's authority over the final verdict — it adds a
layer that can lower confidence or flag a clause for human review if the extraction
itself looks unreliable, which is a stronger, more honest "we don't guess" story than
before: now you're not just trusting one model's output, you're checking it.

### Code

```shell
php artisan make:agent ExtractionVerifierAgent --structured
```

```php
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

#[Provider(Lab::Anthropic)]
#[Model('claude-sonnet-5')]
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
```

Wire into `InterviewController::submitTranscript()`, right after the supervisor
extraction step and before `$this->ruleEngine->evaluate(...)`:

```php
$verification = (new ExtractionVerifierAgent)->prompt(
    "Transcript:\n{$interview->transcript_raw}\n\n".
    "Extracted claims to verify:\n".json_encode($extracted, JSON_PRETTY_PRINT)
)->toArray();

foreach ($verification['verifications'] as $check) {
    if (! $check['is_faithful']) {
        // Force this specific topic's confidence down so ClauseRuleEngine's existing
        // CONFIDENCE_FLOOR naturally routes it to `unclear` — no change needed to the
        // rule engine itself, the verifier just corrects the input it trusts.
        $extracted[$check['topic_key']]['confidence'] = 0.0;
        $extracted[$check['topic_key']]['verifier_note'] = $check['note'];
    }
}

$verdicts = $this->ruleEngine->evaluate($interview, $extracted);
```

Then when persisting each `ClauseAssessment`, also store `verifier_flag` (true if that
topic failed verification) and `verifier_note`.

### Migration
```php
Schema::table('clause_assessments', function (Blueprint $table) {
    $table->boolean('verifier_flag')->nullable()->after('confidence');
    $table->text('verifier_note')->nullable()->after('verifier_flag');
});
```

### UI touch (small, not a redesign)
On the dashboard's audit dossier modal (already exists per the earlier audit) and on
Screen A's live clause badges, render a small shield/checkmark icon when
`verifier_flag` is false (verified) — no icon or a small warning triangle with the
`verifier_note` on hover when true. This is a small icon addition to existing
components, not new screens.

### Demo note — this is your strongest new pitch line
Say this explicitly, it's worth the sentence: *"Every extraction gets independently
fact-checked against the transcript before it ever reaches our rule engine — if the
first agent misreads or hallucinates something, the second agent catches it before it
can become a verdict."* This is a genuine two-layer verification claim backed by real
code, not marketing language.

---

## What NOT to add (be disciplined about scope with 10 hours left)

- **No debate pattern** — reserved for genuinely contested claims with high stakes and
  budget for the cost/latency premium; your `both_disagree` reconciliation logic from
  Improvement-1.md already handles worker-vs-employer conflict deterministically and
  well. Don't duplicate that with a second LLM-based debate layer.
- **No swarm/10+ agents** — explicitly the wrong pattern for a task this size per
  current guidance; over-engineering here burns your remaining hours without making
  the app more correct or more impressive to judges who understand the space.
- **No agent-based follow-up question generation** — the templated `FollowUpQuestions`
  service is deliberately simple and reliable; making it agentic adds live-demo risk
  (an LLM improvising a follow-up question live is much more likely to fail than a
  fixed, tested template) for very little pitch value.

## Time estimate
Feature 1 (fan-out split): ~1.5–2 hours, mostly mechanical given the existing SDK
Sub-Agents pattern and unchanged rule engine downstream.
Feature 2 (verifier-critic): ~1.5–2 hours, similarly mechanical, plus ~30 min for the
small UI icon addition.

Total: roughly 3.5–4 hours of your remaining 10. Do Feature 2 first if you have to
choose one — it's the stronger, more defensible pitch line and the smaller UI lift.
