# Improvement-3.md
## AI-native UI evolution — make the multi-agent work visible, not decorative

Read BUILD_CONTEXT.md, IMPLEMENTATION.md, Improvement-1.md, and Improvement-2.md first.
This document is about UI, but it is not a cosmetic pass — 2026's actual design
consensus (Langfuse/LangSmith-style trace views, Attio's "AI output as a designed
component"), converges on one point: an "AI-native" product looks different because it
*shows real agent work happening*, not because it has more gradients. You already built
the substance (supervisor fan-out, verifier-critic reflection) — this doc is about
surfacing it, which is cheaper and more credible than any purely decorative pass.

**Priority order — do #1 first, it's the single highest-leverage thing on this list:**
1. Live Agent Trace panel (surfaces Improvement-2's real multi-agent work)
2. Verification pulse micro-interaction on Screen A (makes the verifier-critic visible mid-interview)
3. Dark-first restraint pass on the dashboard (the actual "stop looking like 2019" fix)
4. Ambient liveness indicators (small, cheap, don't over-invest here)

---

## Feature 1 — Live Agent Trace Panel (do this first)

### The idea
Right now your supervisor-worker fan-out and verifier-critic reflection loop
(Improvement-2.md) run entirely invisibly — a judge sees a spinner, then a result. That
throws away your best technical differentiator. The 2026 pattern for this (Langfuse,
LangSmith, every serious agent observability tool) is a **trace panel**: a live,
nested, timestamped view of exactly what each agent did, in what order, with what
result — this is what "AI-native" actually looks like in a real product, not a chat
bubble or a gradient.

### Connects to
- **New table**: `agent_trace_events` (or reuse Laravel AI SDK's own
  `agent_conversation_messages` table if `RemembersConversations` is in use — check
  before adding a new table)
- **Modifies**: `InterviewController::submitTranscript()` — emit a trace event at each
  stage (supervisor dispatch → sub-agent calls → verifier check → rule engine → verdict)
- **New frontend component**: `resources/js/Components/AgentTrace.tsx` — a slide-out
  or docked panel, NOT a replacement for the existing clause badges on `interview.tsx`
- **Reuses**: the SDK's `PromptingAgent` / `ToolInvoked` / `StepCompleted` events
  (documented in IMPLEMENTATION.md's source docs, Events section) — listen to these
  instead of hand-rolling trace logging from scratch

### Migration
```php
Schema::create('agent_trace_events', function (Blueprint $table) {
    $table->id();
    $table->foreignId('interview_id')->constrained();
    $table->string('agent_name'); // 'InterviewSupervisorAgent', 'EmploymentFactsAgent', etc.
    $table->string('event_type'); // 'started', 'tool_call', 'completed', 'flagged'
    $table->text('summary'); // short human-readable line, e.g. "Extracted hours_and_duration (confidence: 0.42)"
    $table->unsignedInteger('duration_ms')->nullable();
    $table->json('detail')->nullable(); // full payload for the expandable view
    $table->timestamp('occurred_at');
});
```

### Backend — emit trace events as agents run
Listen to the SDK's own events rather than manually instrumenting every call point:

```php
Event::listen(\Laravel\Ai\Events\PromptingAgent::class, function ($event) {
    AgentTraceEvent::create([
        'interview_id' => request()->route('interview')?->id,
        'agent_name' => class_basename($event->agent),
        'event_type' => 'started',
        'summary' => "Calling {$this->humanReadableAgentName($event->agent)}...",
        'occurred_at' => now(),
    ]);
});

Event::listen(\Laravel\Ai\Events\AgentPrompted::class, function ($event) {
    AgentTraceEvent::create([
        'interview_id' => request()->route('interview')?->id,
        'agent_name' => class_basename($event->agent),
        'event_type' => 'completed',
        'summary' => $this->summarize($event->response), // e.g. "3 topics extracted, avg confidence 0.81"
        'duration_ms' => $event->duration ?? null,
        'occurred_at' => now(),
    ]);
});
```

Expose via a lightweight endpoint the frontend polls or receives during the interview:
`GET /interviews/{interview}/trace`.

### Frontend — the trace panel itself
Design language: monospace or semi-monospace for the event lines (deliberate technical/
observability aesthetic — study Vercel's deployment log view or Linear's activity feed,
not a chat UI), each line timestamped, agent name as a small colored tag, expandable on
click for the full JSON payload. Auto-scrolls as new events arrive during a live
interview.

```tsx
// resources/js/Components/AgentTrace.tsx — structure only
export function AgentTrace({ interviewId }: { interviewId: number }) {
  const [events, setEvents] = useState<TraceEvent[]>([]);
  // poll or subscribe to /interviews/{id}/trace, append new events

  return (
    <div className="font-mono text-xs space-y-1 bg-neutral-950 text-neutral-300 p-4 rounded-lg overflow-y-auto">
      {events.map((e) => (
        <div key={e.id} className="flex gap-2 items-start">
          <span className="text-neutral-500">{formatTime(e.occurred_at)}</span>
          <AgentTag name={e.agent_name} />
          <span>{e.summary}</span>
        </div>
      ))}
    </div>
  );
}
```

Example of what this actually renders during a live Abel interview:
```
14:02:11  [Supervisor]              Dispatching to 2 specialist agents...
14:02:11  [EmploymentFacts]         Extracting age, hours_and_duration, wage...
14:02:11  [RightsProtections]       Extracting child_labor, forced_labor, discrimination, freedom_of_association...
14:02:12  [EmploymentFacts]         Extracted hours_and_duration: confidence 0.31 — ambiguous relative time detected
14:02:12  [RightsProtections]       4/4 topics extracted, avg confidence 0.88
14:02:13  [Verifier]                Checking 7 claims against transcript...
14:02:13  [Verifier]                Flagged hours_and_duration — quote "after the rains" is unanchored
14:02:13  [RuleEngine]              hours_threshold -> unclear (confidence forced to 0.0 by verifier)
14:02:13  [RuleEngine]              Generating follow-up: "About how many hours..."
```

**This single panel, live, on stage, during Abel's interview is worth more than
anything else on this list** — it's the exact moment a judge sees the multi-agent
architecture actually working, not just hears you describe it.

### Placement on Screen A
Add as a collapsible panel below or beside the existing phone-frame interview UI —
don't cram it inside the 390px phone frame itself, that breaks the "this is what a
beneficiary sees" illusion. Frame it as "what's happening behind the scenes" —
literally label it that way, e.g. a header reading "Agent Trace — Live" with a pulsing
dot indicating it's active.

---

## Feature 2 — Verification Pulse Micro-Interaction

### The idea
When a clause badge on Screen A resolves, right now it just changes color. Add a brief
(300-500ms) animated state between "extracted" and "verified" — a small pulse or
shimmer on the badge — so the two-layer verification (extraction, then verification)
is visually perceptible in real time, not just present in the trace panel from Feature 1.

### Connects to
- **Modifies**: the existing clause badge component on `interview.tsx` (already
  confirmed present — live 7-clause badges)
- No backend changes — purely a frontend animation state tied to the existing
  `verifier_flag` field already being returned per-clause (Improvement-2.md)

### Implementation sketch
Badge states, in sequence: pending -> extracting (subtle pulse) -> verifying (shield
icon spins/fades in) -> resolved (final color + icon). Use a short CSS
transition/keyframe, not a heavy animation library — Tailwind's built-in
`animate-pulse` for the "verifying" state is sufficient and cheap to ship.

Keep this small — it's a nice-to-have that reinforces Feature 1's story, not a
standalone feature worth much of your remaining time budget.

---

## Feature 3 — Dark-First Restraint Pass (the actual "not 2019" fix)

### The idea
The "2019 admin SaaS" feeling doesn't come from missing gradients — it comes from too
many competing colors and borders doing no semantic work. The 2026 reference dashboards
(Linear, Vercel, Supabase) share one trait: **near-monochrome by default, color
reserved entirely for meaning**. Your dashboard already has the right semantic colors
(green/amber/red for status) — the fix is removing every OTHER color/border that
isn't carrying information, and defaulting to dark mode as the primary experience
(light mode secondary), not the reverse.

### Connects to
- **Modifies**: `resources/js/Pages/Dashboard.tsx` and the shared design tokens file
  (referenced earlier as "Swiss-editorial design tokens" — locate and audit it)
- **Modifies**: default theme in `use-appearance.tsx` (already exists) — flip the
  default to dark, keep the existing light/dark toggle exactly as-is

### Concrete audit checklist (do this on the existing dashboard, don't rebuild)
- [ ] Every border/divider that isn't separating semantically distinct sections ->
  remove or reduce to a hairline at low opacity
- [ ] Every background tint that isn't a status color (the emerald/amber/rose KPI
  cards from the last round are correct — keep those) -> flatten to the base neutral
  background
- [ ] Confirm the KPI strip's bold typography treatment (already done) is the loudest
  element on the page — everything else should visually defer to it
- [ ] Table row hover states: subtle, not a color change — a 2-4% opacity lift is enough
- [ ] Default the app to dark mode on first load

### Demo note
This is the fix that actually addresses "looks like 2019" — not new components, just
disciplined removal of everything that isn't carrying meaning. Budget 45-60 minutes,
not a rebuild.

---

## Feature 4 — Ambient Liveness Indicators (small, don't over-invest)

Small, cheap additions that reinforce "this is a live system," not a static report:
- A small pulsing dot next to "23/23 Cohort" on the KPI strip reading "Live" — signals
  this isn't a static export
- The evidence pack download button could show a brief "Chaining 23 records..."
  micro-state before the download completes, instead of an instant static download —
  reinforces that real cryptographic work is happening, not just a file fetch

Do not spend more than 15-20 minutes total on this feature — it's genuinely optional
polish, unlike Features 1-3.

---

## What NOT to do

- **Don't add a generic "AI chat" panel/bubble anywhere** — per the research this
  informs, that's specifically the *dated* 2024 pattern now, not the 2026 one. Your
  trace panel (Feature 1) is the more sophisticated, more credible move.
- **Don't add glassmorphism/blur effects for their own sake** — some 2026 references
  use it, but it's a stylistic choice that risks looking decorative rather than
  functional on a data-dense compliance dashboard. Skip it given your remaining time.
- **Don't touch the phone-frame interview UI's core layout** — it already tested well
  in the earlier audit; Feature 1's trace panel sits alongside it, not inside it.

## Time estimate
Feature 1 (trace panel): ~2-2.5 hours — real backend event wiring plus a new
component, budget accordingly, but it's your best remaining use of time on this project.
Feature 2 (verification pulse): ~20-30 minutes, purely additive to existing badges.
Feature 3 (dark-first restraint): ~45-60 minutes, mostly deletion/token changes.
Feature 4 (ambient liveness): ~15-20 minutes.

**Total: ~3.5-4 hours.** Check your remaining clock before starting — if you're under
4 hours total left including rehearsal time, do Feature 1 alone and skip 2-4 entirely.
Feature 1 alone, well executed, is a stronger demo moment than all four done partially.
