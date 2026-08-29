# Improvement-1.md
## Five features closing gaps in the original brief — read BUILD_CONTEXT.md and
## IMPLEMENTATION.md first, this document assumes both are fully implemented already

This document specifies five additions to the existing, working app. It is NOT a
rewrite — every feature below is an addition that connects to specific existing
tables, models, services, and screens. Read each feature's "Connects to" line before
touching any file; do not modify existing verified logic (extraction/verdict split,
hard-case handling, dashboard) except where explicitly instructed here.

**Priority order if time runs short (stop after whichever number you reach):**
1. Bilateral Confirmation Reconciliation — highest brief-relevance, do this first
2. Signed Evidence Pack — second highest, donor-facing "proof" story
3. Longitudinal Continuity Tracking — third, strengthens #1
4. Feature-Phone IVR Mode — fourth, high visual "wow" but narrower judge relevance
5. Transliterated Amharic Path — last, cheapest but lowest marginal impact

---

## Feature 1 — Bilateral Confirmation Reconciliation Engine

### The gap
The brief states the 6-month continuity clause for daily/seasonal workers is
"confirmed either by employer or worker — a door already in the rules that nobody
uses." Our current system only takes the worker's interview as input. There is no
mechanism to accept an employer's confirmation, compare it against the worker's, or
resolve the clause when only one party is reachable. This is the brief's central
unused mechanism — build it now.

### Connects to
- **New table**: `employer_confirmations` (new migration)
- **Existing table**: `sheet_rows` (add two columns)
- **Existing table**: `hard_case_flags` (new flag type)
- **Existing service**: `App\Services\ClauseRuleEngine` (new method)
- **Existing service**: `App\Services\SheetAggregator` (modify `hasDiscrepancy`, add reconciliation call)
- **Existing controller**: `App\Http\Controllers\InterviewController` (no change) — new controller: `App\Http\Controllers\EmployerConfirmationController`
- **New frontend page**: `resources/js/Pages/EmployerConfirm.tsx` — a separate, simple
  link-based form (NOT the phone-interview UI) that an employer opens to confirm or
  dispute a single beneficiary's duration/hours claim
- **Existing dashboard**: `resources/js/Pages/Dashboard.tsx` (add reconciliation status column)

### New migration
```php
// database/migrations/xxxx_create_employer_confirmations_table.php
Schema::create('employer_confirmations', function (Blueprint $table) {
    $table->id();
    $table->foreignId('interview_id')->constrained();
    $table->string('confirmation_token', 64)->unique(); // signed link token, see below
    $table->enum('status', ['pending', 'confirmed', 'disputed', 'expired'])
        ->default('pending');
    $table->unsignedInteger('employer_reported_hours_per_week')->nullable();
    $table->unsignedInteger('employer_reported_months_employed')->nullable();
    $table->text('employer_note')->nullable();
    $table->timestamp('responded_at')->nullable();
    $table->timestamp('expires_at');
    $table->timestamps();
});
```

```php
// migration modifying sheet_rows
Schema::table('sheet_rows', function (Blueprint $table) {
    $table->enum('confirmation_source', ['worker_only', 'employer_only', 'both_agree', 'both_disagree', 'unconfirmed'])
        ->default('unconfirmed')->after('discrepancy_flag');
    $table->timestamp('confirmed_at')->nullable();
});
```

### The reconciliation logic (deterministic, same philosophy as ClauseRuleEngine)

Add this method to `App\Services\ClauseRuleEngine`:

```php
/**
 * Resolve the hours_threshold clause using BOTH sources when available, per the
 * brief's "confirmed either by employer or worker" rule. This does not replace
 * evaluateHours() — it runs AFTER it, using the worker verdict as one input.
 */
public function reconcile(
    array $workerVerdict,       // output of evaluateHours() for this interview
    ?int $employerHoursPerWeek, // null if employer never responded
    ?int $employerMonthsEmployed,
): array {
    // Case 1: no employer data at all — worker's verdict stands alone, valid per brief
    if ($employerHoursPerWeek === null) {
        return [
            'final_status' => $workerVerdict['status'],
            'source' => 'worker_only',
            'note' => 'No employer confirmation received; worker statement accepted alone per programme rules.',
        ];
    }

    $employerMeets = $employerHoursPerWeek >= 20 && $employerMonthsEmployed >= 6;
    $employerStatus = $employerMeets ? 'met' : 'not_met';

    // Case 2: worker was unclear, employer gives a clean confirmation — employer
    // confirmation resolves the clause per the brief's "either" rule
    if ($workerVerdict['status'] === 'unclear') {
        return [
            'final_status' => $employerStatus,
            'source' => 'employer_only',
            'note' => 'Worker account was ambiguous; resolved using employer confirmation.',
        ];
    }

    // Case 3: both parties gave a clear answer and they agree
    if ($workerVerdict['status'] === $employerStatus) {
        return [
            'final_status' => $workerVerdict['status'],
            'source' => 'both_agree',
            'note' => 'Worker and employer accounts agree.',
        ];
    }

    // Case 4: both gave clear answers and they DISAGREE — this is a hard case,
    // never silently pick one side
    return [
        'final_status' => 'unclear',
        'source' => 'both_disagree',
        'note' => "Worker reported {$workerVerdict['status']}, employer reported {$employerStatus} — contradiction requires a field visit.",
    ];
}
```

Wire this into `SheetAggregator::aggregate()` — after computing `is_good_job`, call
`reconcile()` for the `hours_threshold` clause specifically (this is the only clause
the brief ties to bilateral confirmation), and if the result is `both_disagree`, create
a `hard_case_flags` row with `type: 'contradiction'` (existing enum value, no migration
change needed there).

### The employer confirmation flow

1. When an interview completes with `hours_threshold` = `unclear`, generate a signed,
   single-use `confirmation_token` (use Laravel's `Str::random(64)` or a signed URL via
   `URL::temporarySignedRoute`) and create an `employer_confirmations` row with a 72-hour
   `expires_at`.
2. `EmployerConfirmationController::show($token)` renders `EmployerConfirm.tsx` — a
   minimal, non-voice, form-based page (this is explicitly NOT the beneficiary
   interview UI — an employer is filling a short form, not being interviewed): shows
   the beneficiary's job position (no other PII), asks two questions — hours/week,
   months employed — plus an optional note, and a confirm/dispute submit.
3. On submit, `EmployerConfirmationController::store()` updates the
   `employer_confirmations` row, then re-runs `ClauseRuleEngine::reconcile()` and
   updates the linked `sheet_rows.confirmation_source`.
4. Dashboard (`Dashboard.tsx`) gets one new column: a small badge showing
   `confirmation_source` (worker only / employer only / both agree / **both disagree** in
   red / unconfirmed in grey) — this is the single most brief-relevant thing a judge can
   see on the dashboard, make it visually prominent.

### Demo note
For the live pitch, you don't need a real employer on the other end of a link. Pre-seed
2-3 `employer_confirmations` records in `SyntheticInterviewSeeder` with different
outcomes (one `both_agree`, one `both_disagree`, one still `pending`) so the dashboard
column has real variety to show without needing a live second device.

---

## Feature 2 — Signed Evidence Pack (donor-defensible aggregate)

### The gap
The brief's stretch goal for Challenge 3 names it directly: "a signed aggregate with no
identities" as evidence behind an ImpactProtocol certificate. Hiwot's whole problem is
that her six-month sheet isn't defensible to a donor. Right now the dashboard shows
numbers, but nothing is tamper-evident or exportable as proof.

### Connects to
- **Existing tables**: reads from `sheet_rows`, `clause_assessments` (aggregate only,
  no PII — do not include `beneficiaries.name` or `interviews.transcript_raw` in the pack)
- **New service**: `App\Services\EvidencePackGenerator`
- **New controller method**: add `exportEvidencePack()` to existing
  `App\Http\Controllers\DashboardController` (referenced in IMPLEMENTATION.md §6 routes
  but not yet given a class body — create it now if it doesn't exist)
- **New route**: `Route::get('/dashboard/evidence-pack', [DashboardController::class, 'exportEvidencePack'])`
- **New frontend**: a "Download Evidence Pack" button on `Dashboard.tsx`, next to the
  summary strip

### What "signed" means here (hackathon-scoped, not a blockchain integration)
Do not attempt to integrate with the real ImpactProtocol chain — that's explicitly out
of scope per the original Challenge 2 brief ("Do not rebuild it"). What we build instead
is a locally-signed, tamper-evident JSON bundle: a hash chain over the aggregate rows,
signed with an HMAC using an app-held secret key. This is honest about what it is (a
demo-scoped signature, not a blockchain anchor) but demonstrates the *shape* of what a
real signed aggregate would need to contain.

```php
<?php

namespace App\Services;

use App\Models\SheetRow;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class EvidencePackGenerator
{
    public function generate(): array
    {
        $rows = SheetRow::with('interview.clauseAssessments')->get();

        $records = $rows->map(fn (SheetRow $row) => [
            'record_id' => Str::uuid()->toString(), // anonymized, not beneficiary_id
            'job_position' => $row->job_position,
            'gender' => $row->gender,
            'age_band' => $row->age_band,
            'is_good_job' => $row->is_good_job,
            'confirmation_source' => $row->confirmation_source,
            'clause_verdicts' => $row->interview->clauseAssessments->mapWithKeys(
                fn ($a) => [$a->clause_key => ['status' => $a->status, 'confidence' => (float) $a->confidence]]
            ),
            // deliberately excluded: beneficiary name, transcript text, evidence quotes
        ])->values()->toArray();

        $summary = [
            'total_records' => count($records),
            'good_jobs' => collect($records)->where('is_good_job', true)->count(),
            'discrepancies_found' => $rows->where('discrepancy_flag', true)->count(),
            'generated_at' => now()->toIso8601String(),
        ];

        $payload = ['summary' => $summary, 'records' => $records];
        $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE);

        // Hash chain: each record's hash includes the previous record's hash, so
        // altering any single record breaks every subsequent hash — same principle
        // as a blockchain, without the actual chain infrastructure.
        $chainHash = hash('sha256', '');
        $chained = collect($records)->map(function ($record) use (&$chainHash) {
            $chainHash = hash('sha256', $chainHash.json_encode($record, JSON_UNESCAPED_UNICODE));
            return array_merge($record, ['chain_hash' => $chainHash]);
        })->toArray();

        $signature = hash_hmac('sha256', $payloadJson, config('app.key'));

        return [
            'summary' => $summary,
            'records' => $chained,
            'final_chain_hash' => $chainHash,
            'signature' => $signature,
            'signature_algorithm' => 'HMAC-SHA256',
            'verification_note' => 'To verify: recompute the chain hash over records in order, then HMAC the summary+records payload with the app key and compare to `signature`.',
        ];
    }
}
```

Controller:
```php
public function exportEvidencePack(EvidencePackGenerator $generator)
{
    return response()->json($generator->generate())
        ->header('Content-Disposition', 'attachment; filename="evidence-pack.json"');
}
```

### Demo note
On stage, this is a single button click that produces a downloadable JSON file — open
it, scroll to `signature` and `final_chain_hash`, and say: "if a single number in this
pack changes, this hash breaks — that's what makes it defensible to a donor, not just
a spreadsheet." That's a 15-second beat, not a deep dive — don't over-explain the crypto.

---

## Feature 3 — Longitudinal Continuity Tracking

### The gap
The 20hrs/week × 26 weeks (or 520hrs/year) threshold is inherently about time — a
single interview is a snapshot, not a monitored fact. Right now `interviews` has no
concept of a beneficiary being checked more than once, so "26 weeks of continuous
employment" is always just self-reported in one conversation.

### Connects to
- **Existing table**: `beneficiaries` (no change)
- **Existing table**: `interviews` (add `interview_round` column)
- **New table**: `continuity_checkpoints`
- **Existing service**: `App\Services\ClauseRuleEngine::evaluateHours()` (add optional
  checkpoint-aware branch)
- **New frontend component**: `resources/js/Components/ContinuityTimeline.tsx`, embedded
  in `Dashboard.tsx` per beneficiary row (expandable, not a separate page — keep this
  additive, don't restructure the existing table)

### Migrations
```php
Schema::table('interviews', function (Blueprint $table) {
    $table->unsignedInteger('interview_round')->default(1)->after('beneficiary_id');
    // round 1 = initial interview, round 2 = 3-month checkpoint, round 3 = 6-month, etc.
});

Schema::create('continuity_checkpoints', function (Blueprint $table) {
    $table->id();
    $table->foreignId('beneficiary_id')->constrained();
    $table->foreignId('interview_id')->constrained(); // which interview this checkpoint came from
    $table->date('checkpoint_date');
    $table->boolean('still_employed_same_role');
    $table->unsignedInteger('cumulative_weeks_employed')->nullable();
    $table->timestamps();
});
```

### Logic addition
Add a method to `ClauseRuleEngine`, used ONLY when a beneficiary has 2+ interviews:

```php
public function evaluateContinuity(Collection $checkpoints): array
{
    if ($checkpoints->count() < 2) {
        return ['status' => 'unclear', 'reason' => 'Single interview — continuity not yet established, re-check needed.'];
    }

    $allConfirmed = $checkpoints->every(fn ($c) => $c->still_employed_same_role);
    $totalWeeks = $checkpoints->max('cumulative_weeks_employed') ?? 0;

    if (! $allConfirmed) {
        return ['status' => 'not_met', 'reason' => 'Employment was not continuous across checkpoints.'];
    }

    return $totalWeeks >= 26
        ? ['status' => 'met', 'reason' => "Confirmed continuous employment across {$totalWeeks} weeks."]
        : ['status' => 'unclear', 'reason' => "Only {$totalWeeks} of 26 required weeks confirmed so far — needs another checkpoint."];
}
```

This does not replace `evaluateHours()` — for a beneficiary's FIRST interview, the
existing single-transcript logic still runs (a `not yet established` result is a valid,
honest outcome per the same philosophy as everything else in this app). This method
only activates once a second interview round exists.

### Demo note
This is the hardest feature to demo live in a 2-day hackathon since it requires multiple
interviews over time. **Do not try to fake this by running two interviews back-to-back
on stage** — instead, seed 3-4 synthetic beneficiaries in `SyntheticInterviewSeeder`
with 2-3 `continuity_checkpoints` rows each (different dates), so `ContinuityTimeline.tsx`
has real data to render as an expandable row on the dashboard. Say on stage: "this is
designed to work over months, here's what that looks like once a second check-in
happens" and show the pre-seeded timeline — don't pretend it's a single-session feature.

---

## Feature 4 — Feature-Phone IVR Mode

### The gap
Abel is explicitly a feature-phone user. Our current interview UI is a smartphone
browser experience with `MediaRecorder` and a touchscreen — that is NOT what a feature
phone can run. This gap should be named honestly if not built, but here's a scoped way
to actually demonstrate the concept without real telco/USSD integration (which is out
of reach in the remaining time).

### Connects to
- **Existing service**: `App\Services\AddisAiVoice` (reused as-is — TTS/STT calls are identical)
- **Existing controller**: `App\Http\Controllers\InterviewController` (reused as-is —
  the backend pipeline doesn't care about the frontend's shape)
- **New frontend page**: `resources/js/Pages/FeaturePhoneSimulator.tsx` — a visual
  simulator styled to look like a feature phone (small monochrome-style screen, physical
  keypad rendered in CSS, T9-style number input), NOT a real IVR/telco integration
- **New route**: `/demo/feature-phone` — a separate demo mode entry point, doesn't
  touch the main interview flow

### What this actually is
A **visual simulator**, not a real phone system. It reuses 100% of the existing
backend (`AddisAiVoice`, `InterviewController`, `ClauseExtractionAgent`) — the only new
thing is a frontend skin that looks and behaves like a feature phone: numeric keypad
input instead of touch buttons, no live transcript text shown (since a feature phone has
no smartphone screen for that), audio-only prompts and responses, and DTMF-style
numbered menu choices (e.g. "press 1 to confirm, 2 to repeat") layered over the
follow-up question flow from `FollowUpQuestions.php`.

```tsx
// resources/js/Pages/FeaturePhoneSimulator.tsx — structure only
export default function FeaturePhoneSimulator({ interview }: Props) {
  const [screenText, setScreenText] = useState('Incoming call: Programme Check-in');
  // Renders a small monochrome LCD-style screen area + a 3x4 numeric keypad.
  // No live transcript. Audio plays via the SAME /interviews/{id}/transcript
  // endpoint and AddisAiVoice service already built — this page is a skin,
  // not a new backend integration.
  return (
    <div className="mx-auto w-[280px] rounded-3xl bg-neutral-800 p-4">
      <div className="h-32 bg-green-900 text-green-300 font-mono p-2 text-sm">
        {screenText}
      </div>
      <Keypad onPress={(digit) => handleKeypadInput(digit)} />
    </div>
  );
}
```

### Demo note
Say plainly on stage: "our backend already works identically over a feature phone
interface — this is a simulator since we don't have telco/USSD access this weekend, but
the exact same extraction and rule engine you just saw runs underneath it." This is more
credible than implying it's a full IVR system. Being honest about the simulation here is
a strength, not a weakness — it shows you understood the real accessibility constraint
even without building full telco infra.

---

## Feature 5 — Transliterated Amharic Path

### The gap
The brief's stretch goal names this directly: "a transliterated Amharic path" for
low-literacy or feature-phone users where Fidel script doesn't render well on cheap
screens. Currently all Amharic text (follow-up questions, UI captions) is Fidel-script
only.

### Connects to
- **Existing service**: `App\Services\FollowUpQuestions` (add transliterated variants
  alongside existing Amharic templates)
- **New service**: `App\Services\AmharicTransliterator`
- **Existing frontend**: `interview.tsx` and `FeaturePhoneSimulator.tsx` (Feature 4) —
  add a toggle or automatic fallback to transliterated text

### Implementation (rule-based, no external API needed — cheap to ship)
```php
<?php

namespace App\Services;

class AmharicTransliterator
{
    // A focused mapping covering only the syllables actually used in
    // FollowUpQuestions.php's 7 templates — NOT a general-purpose transliteration
    // engine. Expand only if you have spare time; the 7 fixed templates are a small,
    // known set of strings, so hand-transliterating them directly is more reliable
    // than a generic algorithm in the time remaining.
    private const KNOWN_PHRASES = [
        // 'am-fidel-string' => 'latin-transliteration'
        // Fill in the literal transliterations of FollowUpQuestions::TEMPLATES'
        // Amharic variants here, once those are written.
    ];

    public function transliterate(string $amharicText): ?string
    {
        return self::KNOWN_PHRASES[$amharicText] ?? null;
    }
}
```

Since `FollowUpQuestions` has exactly 7 fixed template strings (per
`IMPLEMENTATION.md` §4), the honest, reliable approach in the time remaining is a
**direct lookup table of the 7 known phrases**, not a general Fidel→Latin transliteration
engine (which is a genuinely hard NLP problem — don't attempt to build one in the hours
left). If `FollowUpQuestions` gains an Amharic variant per template (it should, per
Feature 4/5's needs), transliterate those exact 7 strings by hand and hardcode them here.

### Demo note
This is the cheapest feature on this list — a few hours at most, since it's 7 fixed
strings, not a general system. Wire a small toggle into `interview.tsx`: "Fidel | Latin"
— switching it swaps the displayed (not spoken — TTS stays Amharic audio either way)
caption text. This is a visible, judge-legible checkbox that directly answers the
brief's named stretch goal.

---

## Summary — what to tell the judges

If you implement all 5, your pitch gets a new closing beat after the existing "under-15
hard stop" moment: *"We also built the bilateral confirmation the brief said nobody
uses, a signed evidence pack for the donor, continuity tracking across check-ins, a
feature-phone simulator, and a transliterated Amharic path — because Almaz's, Abel's,
and Hiwot's real constraints don't stop at the first working demo."*

If time runs out partway through this list, an honest "we built #1 and #2, and here's
exactly how #3-5 would extend the same architecture" is a stronger judge moment than a
rushed, half-broken version of all five. Use the priority order at the top of this doc.
