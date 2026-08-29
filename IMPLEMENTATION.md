# Implementation Plan — Laravel AI SDK
## Companion to BUILD_CONTEXT.md — this file has the actual code

This is not a description of what to build — it's the code. Follow it top to bottom,
in order, and you have a working app. Each section maps to a phase in
`BUILD_CONTEXT.md` §8. Paste directly into the Laravel app.

> **STATUS (Sun 30 Aug, morning):** §1–§4 and §6–§10 are implemented (Phases 0–4 done).
> §5 (Voice I/O) is finalized using **Addis AI**, not a generic SDK driver. Remaining
> work is Phase 5 polish — see `BUILD_CONTEXT.md` §8 for the current checklist.

---

## 0. Install & configure

```shell
composer require laravel/ai
php artisan vendor:publish --provider="Laravel\Ai\AiServiceProvider"
php artisan migrate
```

`.env`:
```ini
ANTHROPIC_API_KEY=
OPENAI_API_KEY=       # fallback / English STT if not using a dedicated Amharic provider
```

`config/ai.php` — set Anthropic as default text provider (structured extraction needs a
strong instruction-following model; Claude is the safe default here):

```php
'default' => [
    'text' => env('AI_DEFAULT_TEXT_PROVIDER', 'anthropic'),
],
```

If your Amharic STT/TTS provider isn't one of the SDK's built-in drivers
(OpenAI/ElevenLabs/Gemini for TTS, +Groq/Mistral for STT), wire it as an
`openai-compatible` provider per the docs, or call it directly via HTTP outside the SDK
and only use the SDK for the LLM extraction/rule-application layer — that's fine, the
SDK doesn't need to own every step.

---

## 1. Database — migrations (write these once, Phase 0, don't touch schema after)

```php
// database/migrations/xxxx_create_beneficiaries_table.php
Schema::create('beneficiaries', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->enum('persona_type', ['selam', 'abel', 'synthetic']);
    $table->enum('phone_type', ['smartphone', 'feature_phone']);
    $table->string('language'); // 'en' | 'am'
    $table->timestamps();
});

// database/migrations/xxxx_create_interviews_table.php
Schema::create('interviews', function (Blueprint $table) {
    $table->id();
    $table->foreignId('beneficiary_id')->constrained();
    $table->enum('status', ['in_progress', 'completed', 'stopped_hard_case'])
        ->default('in_progress');
    $table->text('transcript_raw')->nullable();
    $table->boolean('consent_given')->default(false);
    $table->timestamp('started_at')->nullable();
    $table->timestamp('completed_at')->nullable();
    $table->timestamps();
});

// database/migrations/xxxx_create_clause_assessments_table.php
Schema::create('clause_assessments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('interview_id')->constrained();
    $table->enum('clause_key', [
        'age_15_plus', 'hours_threshold', 'min_wage',
        'no_child_labor', 'no_forced_labor',
        'no_discrimination', 'freedom_of_association',
    ]);
    $table->enum('status', ['met', 'not_met', 'unclear']);
    $table->decimal('confidence', 3, 2); // 0.00–1.00
    $table->text('evidence_quote')->nullable();
    $table->json('raw_llm_output')->nullable();
    $table->json('sdg_tags')->nullable();
    $table->timestamps();
});

// database/migrations/xxxx_create_sheet_rows_table.php
Schema::create('sheet_rows', function (Blueprint $table) {
    $table->id();
    $table->foreignId('interview_id')->constrained();
    $table->string('job_position');
    $table->string('gender');
    $table->string('age_band');
    $table->unsignedInteger('monthly_salary_etb')->nullable();
    $table->boolean('is_good_job'); // computed from all 7 clause_assessments
    $table->unsignedInteger('employer_reported_value')->nullable();
    $table->unsignedInteger('worker_reported_value')->nullable();
    $table->boolean('discrepancy_flag')->default(false);
    $table->timestamps();
});

// database/migrations/xxxx_create_hard_case_flags_table.php
Schema::create('hard_case_flags', function (Blueprint $table) {
    $table->id();
    $table->foreignId('interview_id')->constrained();
    $table->enum('type', ['under_15', 'refusal', 'contradiction']);
    $table->text('detail');
    $table->text('resolved_action')->nullable();
    $table->timestamps();
});
```

---

## 2. The extraction agent (LLM layer — extraction ONLY, never verdicts)

This is `BUILD_CONTEXT.md` §6.2's core rule made literal: the agent's schema has no
`status` field. It only returns what it heard, a quote, and its own confidence in
having heard it correctly. The verdict is computed separately in step 3.

```shell
php artisan make:agent ClauseExtractionAgent --structured
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
#[Temperature(0.1)] // low temperature — this is extraction, not creative writing
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
```

Usage:

```php
$response = (new ClauseExtractionAgent)->prompt(
    "Interview transcript:\n\n{$interview->transcript_raw}"
);

$extracted = $response->toArray(); // matches schema above
```

---

## 3. The rule engine (deterministic — plain PHP, this is what you defend to judges)

This is the part with zero AI in it. Given the extraction agent's raw output, apply
the actual legal thresholds and produce the final `met` / `not_met` / `unclear` per
clause. **No LLM call happens in this file.**

```php
<?php

namespace App\Services;

use App\Models\Interview;

class ClauseRuleEngine
{
    /** Confidence below this forces `unclear` regardless of what was said. */
    private const CONFIDENCE_FLOOR = 0.55;

    /** ETB legal minimum wage reference — replace with the current confirmed figure
     *  before the live demo; do not ship a guessed number. */
    private const MIN_WAGE_ETB_MONTHLY = 0; // TODO: set real figure before demo

    public function evaluate(Interview $interview, array $extracted): array
    {
        return [
            'age_15_plus' => $this->evaluateAge($extracted['age']),
            'hours_threshold' => $this->evaluateHours($extracted['hours_and_duration']),
            'min_wage' => $this->evaluateWage($extracted['wage']),
            'no_child_labor' => $this->evaluateBooleanClause($extracted['child_labor'], expectAbsence: true),
            'no_forced_labor' => $this->evaluateBooleanClause($extracted['forced_labor'], expectAbsence: true),
            'no_discrimination' => $this->evaluateBooleanClause($extracted['discrimination'], expectAbsence: true),
            'freedom_of_association' => $this->evaluateBooleanClause($extracted['freedom_of_association'], expectAbsence: false),
        ];
    }

    private function belowConfidenceFloor(array $topic): bool
    {
        return $topic['confidence'] < self::CONFIDENCE_FLOOR;
    }

    private function evaluateAge(array $topic): array
    {
        if ($this->belowConfidenceFloor($topic)) {
            return $this->unclear($topic, 'Age not clearly established.');
        }

        if (preg_match('/\b(1[5-9]|[2-9]\d)\b/', $topic['raw_signal'], $m)) {
            $age = (int) $m[1];

            return $age < 15
                ? $this->result('not_met', $topic, "Stated age {$age} is under 15.")
                : $this->result('met', $topic, "Stated age {$age} meets the 15+ threshold.");
        }

        // Under-15 hard case: any explicit signal of a minor should route to
        // the hard-case flag in the controller layer, not just `not_met` here.
        return $this->unclear($topic, 'Age mentioned but not extractable as a number.');
    }

    private function evaluateHours(array $topic): array
    {
        if ($this->belowConfidenceFloor($topic)) {
            return $this->unclear($topic, 'Hours/duration ambiguous — needs follow-up.');
        }

        // This is deliberately conservative: only a clearly-stated, unambiguous
        // duration/hours figure resolves met/not_met. Relative time expressions
        // ("after the rains", "a few months") should have already produced low
        // confidence from the extraction agent and land here as unclear.
        if (preg_match('/\b(\d+)\s*(hour|hr)s?\s*\/?\s*week/i', $topic['raw_signal'], $m)) {
            $hoursPerWeek = (int) $m[1];

            return $hoursPerWeek >= 20
                ? $this->result('met', $topic, "{$hoursPerWeek} hrs/week meets the 20hr/week threshold.")
                : $this->result('not_met', $topic, "{$hoursPerWeek} hrs/week is below the 20hr/week threshold.");
        }

        return $this->unclear($topic, 'Could not extract a concrete hours/duration figure.');
    }

    private function evaluateWage(array $topic): array
    {
        if ($this->belowConfidenceFloor($topic) || self::MIN_WAGE_ETB_MONTHLY === 0) {
            return $this->unclear($topic, 'Wage figure or legal minimum reference not established.');
        }

        if (preg_match('/(\d{2,6})\s*(etb|birr)/i', $topic['raw_signal'], $m)) {
            $wage = (int) $m[1];

            return $wage >= self::MIN_WAGE_ETB_MONTHLY
                ? $this->result('met', $topic, "Reported wage meets the minimum wage threshold.")
                : $this->result('not_met', $topic, "Reported wage is below the minimum wage threshold.");
        }

        return $this->unclear($topic, 'Wage amount not clearly stated.');
    }

    private function evaluateBooleanClause(array $topic, bool $expectAbsence): array
    {
        if ($this->belowConfidenceFloor($topic)) {
            return $this->unclear($topic, 'Insufficient signal to assess this clause.');
        }

        $signal = strtolower($topic['raw_signal']);
        $negativeIndicators = ['no', 'none', 'never', 'not', 'free to', 'allowed to'];
        $positiveIndicators = ['yes', 'forced', 'must', 'not allowed', 'denied', 'unequal'];

        $hasNegative = collect($negativeIndicators)->contains(fn ($w) => str_contains($signal, $w));
        $hasPositive = collect($positiveIndicators)->contains(fn ($w) => str_contains($signal, $w));

        if ($hasPositive && ! $hasNegative) {
            return $this->result($expectAbsence ? 'not_met' : 'met', $topic, 'Signal indicates a problem/issue present.');
        }

        if ($hasNegative && ! $hasPositive) {
            return $this->result($expectAbsence ? 'met' : 'not_met', $topic, 'Signal indicates no problem/issue present.');
        }

        return $this->unclear($topic, 'Mixed or unclear signal on this clause.');
    }

    private function result(string $status, array $topic, string $reason): array
    {
        return [
            'status' => $status,
            'confidence' => $topic['confidence'],
            'evidence_quote' => $topic['evidence_quote'],
            'reason' => $reason,
        ];
    }

    private function unclear(array $topic, string $reason): array
    {
        return $this->result('unclear', $topic, $reason);
    }
}
```

> **Before the demo:** set `MIN_WAGE_ETB_MONTHLY` to the real, currently-legislated
> figure. Do not ship a placeholder into a live pitch — either find the real number or
> keep `min_wage` permanently `unclear` and say so honestly on stage. An honest
> `unclear` is on-brief; a fabricated number is not.

The regex-based signal matching above is intentionally simple and fast to ship in a
hackathon window — it's a reasonable v1 given the extraction agent has already done the
hard work of normalizing free speech into short raw_signal strings. If you have time in
Phase 4/5, swap the regex matchers for a slightly stricter keyword/number parser, but
don't rebuild this mid-sprint unless it's actively producing wrong verdicts on your two
live personas.

---

## 4. Follow-up question agent (conversational layer — the "we don't guess" moment)

Templated, not fully dynamic — deliberate scope cut for time.

```php
<?php

namespace App\Services;

class FollowUpQuestions
{
    private const TEMPLATES = [
        'age_15_plus' => 'Can you tell me exactly how old you are, in years?',
        'hours_threshold' => 'About how many hours do you work in a typical week, and roughly how many months has that been going on?',
        'min_wage' => 'How much are you paid, and how often — for example, per month?',
        'no_child_labor' => 'How old were you when you started this work?',
        'no_forced_labor' => 'If you wanted to stop working here, would you be able to leave?',
        'no_discrimination' => 'Do you feel you are treated the same as your coworkers?',
        'freedom_of_association' => 'Are you free to join a workers group if you wanted to?',
    ];

    public function forClause(string $clauseKey): ?string
    {
        return self::TEMPLATES[$clauseKey] ?? null;
    }
}
```

Wire it into the interview loop: after first-pass extraction, for every `unclear`
clause, ask the SDK's `Audio` class to speak `FollowUpQuestions::forClause($key)`, wait
for the response via `Transcription`, append to `transcript_raw`, re-run
`ClauseExtractionAgent` once. If still `unclear`, stop asking — that's the honest final
state (§6.3 of `BUILD_CONTEXT.md`).

---

## 5. Voice I/O — Addis AI (Amharic + Afaan Oromo), direct HTTP integration

Addis AI is **not** one of the Laravel AI SDK's native STT/TTS drivers, so this is a
plain HTTP client wrapped in a small service class. The extraction/rule-engine core in
§2–§3 doesn't care where the transcript text came from, so this plugs in cleanly.

`.env`:
```ini
ADDIS_API_KEY=sk_...
ADDIS_BASE_URL=https://api.addisassistant.com
ADDIS_DEFAULT_VOICE_ID=am-hamen
```

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class AddisAiVoice
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('services.addis.base_url', env('ADDIS_BASE_URL'));
        $this->apiKey = config('services.addis.api_key', env('ADDIS_API_KEY'));
    }

    /**
     * Transcribe a short (<=60s, <=10MB) audio file. Amharic = 'am', Afaan Oromo = 'om'.
     */
    public function transcribe(string $audioPath, string $languageCode = 'am'): string
    {
        $response = Http::withHeaders(['x-api-key' => $this->apiKey])
            ->attach('audio', file_get_contents($audioPath), basename($audioPath))
            ->post("{$this->baseUrl}/api/v2/stt", [
                'request_data' => json_encode(['language_code' => $languageCode]),
            ]);

        $response->throw(); // fail loud during a hackathon — don't silently swallow STT errors

        return $response->json('data.transcription');
    }

    /**
     * Generate a TTS clip (Addis Voices 2) and return the durable, playable audio URL.
     * Billed 5 ETB/generated minute — during rehearsal, call estimate() first if you're
     * watching spend; during the live demo just generate, latency matters more than cost.
     */
    public function speak(string $text, string $languageCode = 'am', ?string $voiceId = null): string
    {
        $response = Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'content-type' => 'application/json',
        ])->post("{$this->baseUrl}/api/v1/voice/generations", [
            'text' => $text,
            'voice_id' => $voiceId ?? config('services.addis.default_voice_id', 'am-hamen'),
            'language' => $languageCode,
            'output_format' => 'mp3_44100',
            'client_request_id' => (string) \Illuminate\Support\Str::uuid(),
        ]);

        $response->throw();

        return $response->json('data.audio_url'); // signed URL — don't store it permanently, store the clip ID instead if you need to replay later
    }

    public function estimate(string $text, string $languageCode = 'am', ?string $voiceId = null): array
    {
        $response = Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'content-type' => 'application/json',
        ])->post("{$this->baseUrl}/api/v1/voice/estimate", [
            'text' => $text,
            'voice_id' => $voiceId ?? config('services.addis.default_voice_id', 'am-hamen'),
            'language' => $languageCode,
            'output_format' => 'mp3_44100',
        ]);

        $response->throw();

        return $response->json('data') ?? $response->json();
    }
}
```

**Known constraints to respect in the frontend recording UI (Screen A):**
- Max audio duration per STT call: **60 seconds** — chunk longer beneficiary answers, or
  prompt shorter turns in the interview script.
- Max file size: **10MB**.
- **Single-speaker only** — never let two voices overlap in one clip (not a concern for
  a 1-on-1 interview demo, but worth stating in case a teammate jumps in during rehearsal).
- Record mono, 16kHz+, speaker 10–30cm from mic, quiet room — the venue itself may be
  noisy; test in the actual pitch room, not just the hotel corridor.
- Addis Voices 2 TTS **does not stream partial audio** — the whole clip is generated
  then returned; budget for that latency in the live demo (don't expect word-by-word
  TTS playback like the Realtime API would give you).

**Alternative — Addis AI Realtime API (WebSocket, <300ms, bidirectional):**
If Phase 5 time allows and the current turn-based STT→extract→TTS loop feels too slow
on stage, Addis AI also exposes a low-latency WebSocket Realtime API
(`wss://relay.addisassistant.com/ws?apiKey=...`) that streams PCM16 audio both ways and
supports natural interruption. This is a bigger integration change (raw WebSocket + a
Float32→Int16 PCM conversion in the browser) and is **not** in the current build — only
reach for it if the turn-based loop is visibly too slow in rehearsal and there's still
runway before the pitch. Don't swap architectures this late unless the current one is
demonstrably failing.

`AddisAiVoice` replaces the SDK's `Laravel\Ai\Audio` / `Laravel\Ai\Transcription`
classes for this project — those remain fine for English (Whisper or similar), but all
Amharic/Afaan Oromo voice I/O goes through this service.

---

## 6. Controller — the interview lifecycle end to end

```php
<?php

namespace App\Http\Controllers;

use App\Ai\Agents\ClauseExtractionAgent;
use App\Models\Beneficiary;
use App\Models\ClauseAssessment;
use App\Models\HardCaseFlag;
use App\Models\Interview;
use App\Services\ClauseRuleEngine;
use App\Services\FollowUpQuestions;
use App\Services\SheetAggregator;
use Illuminate\Http\Request;

class InterviewController extends Controller
{
    public function __construct(
        private ClauseRuleEngine $ruleEngine,
        private FollowUpQuestions $followUps,
        private SheetAggregator $aggregator,
    ) {}

    public function start(Beneficiary $beneficiary)
    {
        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        return response()->json(['interview_id' => $interview->id]);
    }

    public function submitTranscript(Request $request, Interview $interview)
    {
        $request->validate(['transcript' => 'required|string']);

        $interview->update([
            'transcript_raw' => $interview->transcript_raw
                ? $interview->transcript_raw."\n".$request->transcript
                : $request->transcript,
        ]);

        $response = (new ClauseExtractionAgent)->prompt(
            "Interview transcript:\n\n{$interview->transcript_raw}"
        );

        $extracted = $response->toArray();
        $verdicts = $this->ruleEngine->evaluate($interview, $extracted);

        // Hard case: under-15 — stop immediately, flag, never count
        if (($verdicts['age_15_plus']['status'] ?? null) === 'not_met') {
            $interview->update(['status' => 'stopped_hard_case']);
            HardCaseFlag::create([
                'interview_id' => $interview->id,
                'type' => 'under_15',
                'detail' => $verdicts['age_15_plus']['reason'],
            ]);

            return response()->json([
                'stopped' => true,
                'reason' => 'under_15',
            ]);
        }

        foreach ($verdicts as $clauseKey => $verdict) {
            ClauseAssessment::updateOrCreate(
                ['interview_id' => $interview->id, 'clause_key' => $clauseKey],
                [
                    'status' => $verdict['status'],
                    'confidence' => $verdict['confidence'],
                    'evidence_quote' => $verdict['evidence_quote'],
                    'raw_llm_output' => $extracted,
                ]
            );
        }

        $followUpsNeeded = collect($verdicts)
            ->filter(fn ($v) => $v['status'] === 'unclear')
            ->keys()
            ->map(fn ($key) => [
                'clause_key' => $key,
                'question' => $this->followUps->forClause($key),
            ])
            ->filter(fn ($f) => $f['question'] !== null)
            ->values();

        return response()->json([
            'stopped' => false,
            'verdicts' => $verdicts,
            'follow_ups' => $followUpsNeeded,
        ]);
    }

    public function complete(Interview $interview)
    {
        $interview->update(['status' => 'completed', 'completed_at' => now()]);
        $this->aggregator->aggregate($interview);

        return response()->json(['status' => 'completed']);
    }
}
```

```php
// routes/web.php
Route::post('/beneficiaries/{beneficiary}/interviews', [InterviewController::class, 'start']);
Route::post('/interviews/{interview}/transcript', [InterviewController::class, 'submitTranscript']);
Route::post('/interviews/{interview}/complete', [InterviewController::class, 'complete']);
Route::get('/dashboard', [DashboardController::class, 'index']);
```

---

## 7. Aggregation service (feeds the dashboard)

```php
<?php

namespace App\Services;

use App\Models\Interview;
use App\Models\SheetRow;

class SheetAggregator
{
    public function aggregate(Interview $interview): SheetRow
    {
        $assessments = $interview->clauseAssessments;
        $isGoodJob = $assessments->count() === 7
            && $assessments->every(fn ($a) => $a->status === 'met');

        return SheetRow::updateOrCreate(
            ['interview_id' => $interview->id],
            [
                'is_good_job' => $isGoodJob,
                'discrepancy_flag' => $this->hasDiscrepancy($interview),
                // job_position / gender / age_band / salary come from the
                // beneficiary + interview metadata captured during intake
            ]
        );
    }

    private function hasDiscrepancy(Interview $interview): bool
    {
        $row = $interview->sheetRow;

        return $row
            && $row->employer_reported_value !== null
            && $row->worker_reported_value !== null
            && $row->employer_reported_value !== $row->worker_reported_value;
    }
}
```

---

## 8. Frontend (Inertia + React) — the two screens that carry the demo

### Screen A: Live Interview (`resources/js/Pages/Interview.tsx`)

Structure only — build to the phone-width viewport spec in `BUILD_CONTEXT.md` §7:

```tsx
export default function Interview({ interview }: { interview: Interview }) {
  const [transcript, setTranscript] = useState('');
  const [clauses, setClauses] = useState<ClauseState[]>(initialClauseState);
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);

  // streaming transcript reveal, clause badges updating live as verdicts land,
  // ambiguous-quote-next-to-follow-up-question UI per BUILD_CONTEXT.md §7 Screen A
  return (
    <div className="mx-auto max-w-[390px] min-h-screen bg-background">
      <TranscriptStream text={transcript} />
      <ClauseBadgeGrid clauses={clauses} />
      {followUp && <FollowUpPrompt followUp={followUp} />}
      <ConsentBanner />
    </div>
  );
}
```

### Screen B: Monitoring Dashboard (`resources/js/Pages/Dashboard.tsx`)

```tsx
export default function Dashboard({ rows, summary }: DashboardProps) {
  return (
    <div className="p-8 space-y-6">
      <SummaryStrip
        companies={summary.companies}
        interviewed={summary.interviewed}
        discrepancies={summary.discrepancies}
        hardCases={summary.hardCases}
      />
      <SheetRowsTable rows={rows} /> {/* worker vs employer, flagged rows highlighted */}
    </div>
  );
}
```

Build `SheetRowsTable` with shadcn/ui `Table`, red/amber row backgrounds on
`discrepancy_flag`, small `Badge` components for confidence and SDG tags — see
`BUILD_CONTEXT.md` §7 Screen B for the full spec of what this table needs to
communicate.

---

## 9. Seed script — Phase 2 (lunch), populate 20+ synthetic records fast

```php
<?php
// database/seeders/SyntheticInterviewSeeder.php

namespace Database\Seeders;

use App\Ai\Agents\ClauseExtractionAgent;
use App\Models\Beneficiary;
use App\Models\Interview;
use App\Services\ClauseRuleEngine;
use App\Services\SheetAggregator;
use Illuminate\Database\Seeder;
use Laravel\Ai\Enums\Lab;

class SyntheticInterviewSeeder extends Seeder
{
    // Generate varied synthetic transcripts covering: clean cases, one under-15,
    // one refusal, one employer/worker contradiction, a spread of job types.
    private array $syntheticTranscripts = [
        // Paste 20 generated transcripts here — see BUILD_CONTEXT.md §Phase 2
    ];

    public function run(ClauseRuleEngine $ruleEngine, SheetAggregator $aggregator): void
    {
        foreach ($this->syntheticTranscripts as $i => $transcriptText) {
            $beneficiary = Beneficiary::create([
                'name' => "Synthetic Beneficiary {$i}",
                'persona_type' => 'synthetic',
                'phone_type' => 'smartphone',
                'language' => 'en',
            ]);

            $interview = Interview::create([
                'beneficiary_id' => $beneficiary->id,
                'status' => 'in_progress',
                'transcript_raw' => $transcriptText,
                'started_at' => now(),
            ]);

            $extracted = (new ClauseExtractionAgent)
                ->prompt("Interview transcript:\n\n{$transcriptText}")
                ->toArray();

            $verdicts = $ruleEngine->evaluate($interview, $extracted);

            foreach ($verdicts as $clauseKey => $verdict) {
                $interview->clauseAssessments()->create([
                    'clause_key' => $clauseKey,
                    'status' => $verdict['status'],
                    'confidence' => $verdict['confidence'],
                    'evidence_quote' => $verdict['evidence_quote'],
                    'raw_llm_output' => $extracted,
                ]);
            }

            $interview->update(['status' => 'completed', 'completed_at' => now()]);
            $aggregator->aggregate($interview);
        }
    }
}
```

Run with `php artisan db:seed --class=SyntheticInterviewSeeder` at lunch, before
Sprint 2 — see `BUILD_CONTEXT.md` §8 Phase 2.

---

## 10. Testing (cheap insurance — do this once core logic is stable)

```php
use App\Ai\Agents\ClauseExtractionAgent;

test('extraction agent never outputs a status field', function () {
    ClauseExtractionAgent::fake([
        [
            'age' => ['raw_signal' => 'said they are 19', 'evidence_quote' => 'I am 19', 'confidence' => 0.9],
            // ...
            'needs_followup_on' => [],
        ],
    ]);

    $response = (new ClauseExtractionAgent)->prompt('...');

    expect($response->toArray())->not->toHaveKey('status');
});

test('under-15 hard case stops the interview', function () {
    $interview = Interview::factory()->create();

    $ruleEngine = app(ClauseRuleEngine::class);
    $verdicts = $ruleEngine->evaluate($interview, [
        'age' => ['raw_signal' => 'said they are 13', 'evidence_quote' => 'I am 13', 'confidence' => 0.95],
        // ...
    ]);

    expect($verdicts['age_15_plus']['status'])->toBe('not_met');
});
```

---

## 11. What's still genuinely open (Phase 5 remaining — be honest, don't hide it)

- **The real ETB minimum wage figure** — §3 flags this with a `TODO`. Find it before
  the demo or keep the clause honestly `unclear` and say so on stage.
- **shadcn/ui visual polish for the two screens** — §8 gives structure, not final
  visual design; this is the main remaining Phase 5 work per `BUILD_CONTEXT.md` §8.
- **Consent capture UX/storage** — `consent_given` exists as a column; confirm the
  actual UI flow shows it clearly during the live demo (§7 Screen A in
  `BUILD_CONTEXT.md` calls this out as visible-and-explicit, not implied).
- **Fallback demo video** — record a full backup interview run in case live mic/Addis
  AI latency causes issues on stage.
- **Pitch script timing** — rehearse to 5 minutes, at least twice, per the checklist
  in `BUILD_CONTEXT.md` §8.

Resolved since the last version of this doc: Amharic/Afaan Oromo STT/TTS is now fully
specified against Addis AI in §5 (no longer an open item); Phases 0–4 are complete.
