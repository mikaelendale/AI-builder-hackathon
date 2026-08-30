# Improvement-4.md
## Making the system read as smart, plus full Afaan Oromo support

Read BUILD_CONTEXT.md through Improvement-3.md first. Two threads here: (1) the app
currently *is* smart (multi-agent extraction, verification, deterministic rules) but a
lot of its copy and interactions don't communicate that — generic labels like
"PENDING" or "Loading..." make a genuinely intelligent system read as a dumb form.
(2) Afaan Oromo is a first-class language in your own voice provider (Addis AI
supports `om` identically to `am` across STT, TTS, and translation) and in the
original brief's own personas (Almaz, Challenge 1) — right now the app only speaks
Amharic and English, which undersells both the tech and the accessibility story.

**Priority order:**
1. Afaan Oromo end-to-end (`om`) — mechanical, high-value, low-risk
2. Context-aware follow-up copy (echoes what was actually heard — this is your
   biggest "obviously smart" win)
3. Plain-language system reasoning replacing generic status labels
4. Natural-language dashboard search bar ("Ask the Ledger")

---

## Feature 1 — Afaan Oromo (`om`) End-to-End

### Why this is easy
`App\Services\AddisAiVoice` (IMPLEMENTATION.md §5) already accepts a `languageCode`
parameter for both `transcribe()` and `speak()` — Addis AI's STT/TTS/translation APIs
treat `am` and `om` identically at the protocol level. This is almost entirely a
matter of exposing the option that already works under the hood, not building new
capability.

### Connects to
- **Existing service**: `App\Services\AddisAiVoice` — no code change needed, just call
  with `'om'` instead of `'am'`
- **Existing table**: `beneficiaries.language` — already a free-text/enum column
  (BUILD_CONTEXT.md §6.1 — currently `'en' | 'am'`), widen to include `'om'`
- **Existing service**: `App\Services\FollowUpQuestions` — needs Afaan Oromo variants
  of the 7 templates alongside the existing Amharic/English ones
- **Existing frontend**: `interview.tsx`'s language toggle (currently `EN | አማርኛ` per
  the screenshot) — add a third option
- **Existing service**: `App\Services\AmharicTransliterator` (Improvement-1.md §5) —
  rename conceptually to cover both scripts, or add a sibling
  `OromoTransliterator`/shared `TransliterationService` if Afaan Oromo's Latin-based
  script needs different handling (Afaan Oromo is already written in Latin script by
  default via Qubee orthography — so transliteration is likely NOT needed for Oromo the
  way it is for Amharic's Fidel script; confirm this and skip building anything
  unnecessary here)

### Code changes
```php
// FollowUpQuestions.php — add a third language dimension
private const TEMPLATES = [
    'age_15_plus' => [
        'en' => 'Can you tell me exactly how old you are, in years?',
        'am' => '...existing Amharic...',
        'om' => 'Umriikee waggaa meeqa akka taatan naaf himuu dandeessuu?',
    ],
    // ... same pattern for all 7 clauses
];

public function forClause(string $clauseKey, string $language = 'am'): ?string
{
    return self::TEMPLATES[$clauseKey][$language] ?? self::TEMPLATES[$clauseKey]['am'] ?? null;
}
```

```tsx
// interview.tsx language toggle — add a third segment
<LanguageToggle
  options={[
    { code: 'en', label: 'EN' },
    { code: 'am', label: 'አማርኛ' },
    { code: 'om', label: 'Afaan Oromoo' },
  ]}
/>
```

Pass the selected language code through to every `AddisAiVoice::transcribe()` /
`::speak()` call and into `FollowUpQuestions::forClause($key, $language)`.

### Extraction agent — one open question, answer it before building
`EmploymentFactsAgent` / `RightsProtectionsAgent` currently extract from raw transcript
text directly. Confirm whether Claude (your extraction model) reasons reliably over
Afaan Oromo text directly, or whether it's more reliable to route Afaan Oromo
transcripts through Addis AI's `/api/v1/translate` (`om` → `en`) before extraction,
then extract from the English translation. **Test this with 2-3 real Afaan Oromo
sentences before committing to either path** — don't assume, verify with a quick manual
check since this affects extraction accuracy, which is the part of the app you can't
afford to get wrong.

### Demo note
Adding a third working language live in front of judges, especially given you already
have two working, is a strong, cheap "we built this to scale beyond one language" beat
— worth one sentence in the pitch, doesn't need its own persona/demo unless time allows.

---

## Feature 2 — Context-Aware Follow-Up Copy (highest-leverage "smart" fix)

### The problem
Static templates ("About how many hours do you work in a typical week...") are fine
functionally but read as a form, not an agent that was actually listening. The fix
costs almost nothing: **echo back what was actually heard before asking the
clarifying question** — this is the single cheapest, most visible way to make the
system read as intelligent rather than scripted.

### Connects to
- **Modifies**: `App\Services\FollowUpQuestions` — add a method that takes the
  extraction agent's actual `raw_signal`/`evidence_quote` for that topic and composes
  a dynamic lead-in before the static question
- **Modifies**: `InterviewController::submitTranscript()` — pass the extracted
  evidence quote into the follow-up composition instead of using the bare template

### Code
```php
public function composeContextualFollowUp(string $clauseKey, string $language, ?string $heardQuote): string
{
    $baseQuestion = $this->forClause($clauseKey, $language);

    if (! $heardQuote) {
        return $baseQuestion; // fall back to plain template if nothing was extracted
    }

    // Lead-ins per language — keep these short and natural, not robotic
    $leadIns = [
        'en' => "You mentioned \"{$heardQuote}\" — ",
        'am' => "«{$heardQuote}» እንዳሉ ሰምቻለሁ — ",
        'om' => "\"{$heardQuote}\" jettanii naaf himtan — ",
    ];

    return ($leadIns[$language] ?? $leadIns['en']).lcfirst($baseQuestion);
}
```

Result, concretely: instead of Abel hearing a generic "about how many hours do you
work," he hears "You mentioned 'after the rains' — about how many hours do you work in
a typical week?" — this is a one-line change with a genuinely large perceived-
intelligence payoff, because it's true (the system did actually hear that), not a
canned trick.

### UI echo, Screen A
Add a small "Heard: '...'" chip above the follow-up prompt in `interview.tsx`,
sourced from the same `evidence_quote` — this reinforces the same signal visually,
not just in the spoken/written question.

---

## Feature 3 — Plain-Language System Reasoning (replace generic status labels)

### The problem
"PENDING," "UNCLEAR (0%)," and generic spinner text ("Loading...") don't communicate
*why* — and a system that can't explain itself in plain language reads as dumb even
when the underlying logic is sound. You have the reasoning already (every
`ClauseRuleEngine` verdict includes a `reason` string, IMPLEMENTATION.md §3) — it's
just not surfaced consistently everywhere a status appears.

### Connects to
- **Existing data**: `ClauseRuleEngine::evaluate()` already returns a `reason` per
  clause (IMPLEMENTATION.md §3) — confirm this is being persisted (it should map to
  something in `clause_assessments` or the trace event `summary` field from
  Improvement-3.md) and surfaced in the UI everywhere a badge/status appears, not just
  in the expandable trace panel
- **Modifies**: badge/tooltip components on both `interview.tsx` and `dashboard.tsx` —
  replace bare status text with the actual reason string on hover/tap
- **Modifies**: loading/spinner copy throughout — replace generic "Loading..." with
  what's actually happening, sourced from the trace panel's own event summaries built
  in Improvement-3.md (you already generate this text for the trace panel — reuse it
  as the spinner/status copy instead of writing a second, generic set of strings)

### Concrete copy fixes (small, do these directly, no code architecture needed)
| Before | After |
|---|---|
| `PENDING` | `Waiting on your answer` |
| `UNCLEAR (0%)` | `Needs a clearer answer — asking a follow-up` |
| `Loading...` | `Checking what you said against the transcript...` (reuse Improvement-3's trace summary text) |
| Generic `Discrepancy` badge | `Worker and employer don't agree — flagged for review` |
| Generic `Verified` badge | `Confirmed by both worker and employer` |

This is mostly a copy pass across existing components, not new features — budget it
as "find every generic status string, replace with the plain-language reason that's
already computed and available."

---

## Feature 4 — Natural-Language Dashboard Search ("Ask the Ledger")

### The idea
The 2026 pattern this borrows from (Attio's "Ask Attio" sitting inside the record
view) is exactly what makes a dashboard read as AI-native rather than a static admin
table: a natural-language query bar that filters/summarizes the existing data, not a
new chat panel bolted on top.

### Connects to
- **New agent**: `App\Ai\Agents\LedgerQueryAgent` — structured output that translates
  a natural-language question into filter parameters against the existing
  `sheet_rows`/`clause_assessments` tables (NOT a new data source — this queries what's
  already there)
- **Modifies**: `Dashboard.tsx` — add a search bar above the KPI strip
- **New endpoint**: `POST /dashboard/query`

### Code
```php
<?php
// app/Ai/Agents/LedgerQueryAgent.php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Attributes\Model;
use Laravel\Ai\Attributes\Provider;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Promptable;
use Stringable;

#[Provider(Lab::Anthropic)]
#[Model('claude-sonnet-5')]
class LedgerQueryAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
            Translate the user's natural-language question about the beneficiary
            ledger into structured filter parameters. Do not answer the question
            yourself — only translate it into filters the application already
            supports: confirmation_source, discrepancy_flag, hard_case type,
            is_good_job, and free-text search over job_position.
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
            'human_readable_summary' => $schema->string()->required(), // e.g. "Showing 8 disputed cases"
        ];
    }
}
```

Wire this into a filter of the existing `SheetRow` query in `DashboardController` —
this agent only ever produces filter parameters over data you already compute and
display; it does not generate new facts. Display `human_readable_summary` above the
filtered table so the interaction feels conversational without being a chat UI.

### Demo note
A one-line live query like "show me the disputed cases" typed into this bar,
instantly filtering the table with a plain-language confirmation above it, is a strong,
fast pitch beat — but it's Feature 4 for a reason. Only build this if Features 1-3 are
done with time to spare.

---

## Time estimate (you have ~9h20m remaining after this doc)
- Feature 1 (Afaan Oromo): ~1–1.5 hours, mostly mechanical
- Feature 2 (context-aware follow-ups): ~45 min–1 hour, small and very high leverage
- Feature 3 (plain-language reasoning copy): ~1 hour, mostly a copy/find-replace pass
- Feature 4 (natural-language search): ~1.5–2 hours, the most complex addition here

**Total: ~4.5–5.5 hours.** This still leaves real time for deploy verification,
fallback video, and rehearsal — but don't let this list expand further. After Feature 4
(or wherever you stop), switch fully to delivery mode: no more improvement docs.
