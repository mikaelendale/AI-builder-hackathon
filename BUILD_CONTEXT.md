# Project Context & Build Plan
## "Ask the People the Programme Is For" — Beneficiary Verification Platform
### AI Builder Hackathon Addis Ababa, 29–30 Aug 2026 · Challenge 3 (sequa Ethiopia)

This document is the single source of truth for AI-assisted development on this project.
Any AI coding assistant (Claude Code, Cursor, Copilot, etc.) working on this repo should
read this file in full before writing code. It contains the problem context, the people
we are building for, the full technical plan, the data model, the UI spec, and the
phased execution plan mapped to the actual hackathon clock.

> **STATUS (Sun 30 Aug, morning):** Phases 0–4 are complete (spine, seed data, voice
> loop, hard cases, Saturday dry run + fixes all done). Currently in **Phase 5** — final
> polish, UI, pitch prep. See §8 for what's left. Voice provider is **Addis AI**, not a
> generic placeholder — see §5 and `IMPLEMENTATION.md` §5 for exact integration.

---

## 1. The Problem (why this exists)

Job-creation programmes report "good jobs created" every six months using an employer-
filled monitoring sheet: headcount, gender, age band, average monthly salary, training
participation, and seven improvement criteria. Nobody ever asks the worker.

A "good job" is defined precisely, and most programmes never actually check it:

- 15 years or older
- Formal or informal work
- 20 hours/week over 26 weeks, OR 520 hours/year
- At least the legally established minimum wage
- No child labour
- No forced labour
- No discrimination
- Freedom of association

For daily/seasonal workers, the clause counts only above six months of continuous
employment, confirmed **"either by employer or worker"** — a rule that exists in the
programme guidelines but is never used in practice, because nobody has a scalable way
to reach thousands of beneficiaries directly.

We are building the tool that uses that door.

## 2. Who we are building for (personas — use these verbatim in demo data and copy)

**Selam, 22, Addis Ababa.** Trained free in sales, placed in a call centre 6 months ago,
paid monthly. Smartphone, limited data bundle. Nobody has asked her whether a contract
exists or pension is deducted. → **Clean case.** English. All clauses should resolve
`met` with high confidence. This is our "everything works" persona.

**Abel, 19, construction site outside Adama.** Daily/seasonal worker, paid in cash.
Feature phone, Amharic only, reads poorly. Started "after the rains" — he cannot say if
that's 5 or 7 months, and that number decides whether he counts at all. → **Ambiguous
case.** Amharic. The hours/duration clause should resolve `unclear`, trigger a targeted
follow-up question, and still may remain `unclear` after — this is the demo's central
"we don't guess" moment.

**Hiwot, 34, monitoring officer.** Files the six-month sheet for 23 companies by hand,
using employer-reported figures she "half believes," no field-visit budget, needs
evidence that survives donor evaluation. → **She is the actual user of the aggregation
dashboard.** Every UI decision on the dashboard side should be judged by: "does this
give Hiwot something she can defend to a donor?"

## 3. What we are building (scope, locked)

An agent that interviews beneficiaries by voice, in their own language, on any phone,
and turns the conversation into structured per-clause verdicts that roll up into the
programme's official six-month monitoring sheet — sitting next to the employer's
self-reported number, with disagreements visibly flagged.

**One sentence output:** per person, a structured record carrying a verdict on each
clause, a confidence score, the consent given, and a line that aggregates into the
six-month sheet.

**Explicitly out of scope for the 2-day build:** USSD/feature-phone telephony
integration, full 17-SDG mapping, multi-employer batch upload UI, authentication/roles
beyond a single demo login, production-grade PII handling (use synthetic data only).

**In scope, non-negotiable:**
- Live voice interview, unseen input, on a phone-sized screen
- Deterministic clause-rule engine (not LLM vibes) computing final status
- `unclear` is a first-class, honest outcome — never silently guessed
- Under-15 hard stop, tested live
- Employer-reported vs worker-reported comparison, visibly flagged
- 20+ aggregated records live in the dashboard, not just 2
- SDG tags (8.5, 8.6, 8.8, 5.5, 1.2) attached per verdict (cheap, in-brief stretch goal)

## 4. Why this makes a strong demo (judging lens)

The event brief explicitly says: *"Forget super-app solutions. We will reward focus and
creativity."* And for this challenge specifically: *"Working means we run one on our
phone at your table and see the aggregate appear."*

So the win condition is: **one real live interview, on a real phone, with a real
ambiguous case handled honestly, feeding into a dashboard that already has weight behind
it (20+ records) and that visibly disagrees with the employer's number.** That's the
whole pitch. Everything else is in service of that 90 seconds on stage.

---

## 5. Tech stack

- **Framework:** Laravel (latest), Inertia.js + React, TypeScript
- **Styling:** Tailwind 4 + shadcn/ui — enterprise, not hackathon-default. See §8 UI spec.
- **DB:** PostgreSQL
- **Voice (Amharic + Afaan Oromo):** **Addis AI** —
  `POST /api/v2/stt` for transcription (60s max audio, 10MB max file, mono 16kHz+
  recommended, single-speaker only), `POST /api/v1/voice/generations` (Addis Voices 2)
  for TTS, billed 5 ETB/generated minute — always call the cost estimate endpoint
  before generating during live demo prep. `am-hamen` is the default Amharic voice.
  See `IMPLEMENTATION.md` §5 for the exact integration (this is a direct HTTP
  integration, not one of the Laravel AI SDK's native STT/TTS drivers).
- **Voice (English):** Whisper (or equivalent) for Selam's persona
- **Translation (optional, Amharic↔English):** Addis AI `/api/v1/translate` — only
  needed if the extraction agent should reason over an English-normalized transcript;
  not required if the extraction agent works directly on Amharic text
- **LLM:** structured output / tool-calling for **extraction only** — the model never
  decides final clause status, see §6.2
- **Hosting:** deployed from Day 0, not localhost-only (Laravel Cloud or equivalent) —
  a demo that only runs on one laptop is a single point of failure
- **Version control:** GitHub, public repo, commit early and often — see §9

---

## 6. Data model & core logic

### 6.1 Schema

```
beneficiaries
  id, name, persona_type, phone_type, language, created_at

interviews
  id, beneficiary_id, status (in_progress|completed),
  transcript_raw, consent_given (bool), started_at, completed_at

clause_assessments
  id, interview_id, clause_key, status (met|not_met|unclear),
  confidence (0.0–1.0), evidence_quote, raw_llm_output, sdg_tags[]

sheet_rows
  id, interview_id, job_position, gender, age_band, monthly_salary_etb,
  is_good_job (computed from all 7 clause_assessments),
  employer_reported_value, worker_reported_value, discrepancy_flag (bool)

hard_case_flags
  id, interview_id, type (under_15|refusal|contradiction),
  detail, resolved_action, created_at
```

Fixed clause enum (do not change mid-build):
`age_15_plus`, `hours_threshold`, `min_wage`, `no_child_labor`, `no_forced_labor`,
`no_discrimination`, `freedom_of_association`

### 6.2 The extraction/verdict split (this is the architectural core — read carefully)

Two-step pipeline, always:

1. **Extraction (LLM, structured output):** given a transcript, extract *raw signal*
   per clause — what did the person actually say, plus a direct evidence quote, plus
   the model's own confidence in what it heard. The LLM **never** outputs `met` /
   `not_met` / `unclear` directly.
2. **Verdict (deterministic PHP, no LLM):** a plain rule-engine function takes the raw
   signal and applies the actual legal thresholds (age ≥ 15, 20hrs/wk × 26wks or
   520hrs/yr, minimum wage lookup, boolean checks) to compute the final status. If
   signal is ambiguous or extraction confidence is below threshold, the rule engine
   forces `unclear` — it is never allowed to guess.

This split is the single most important design decision in the whole app. It's what
lets you say to a judge, with a straight face, "the AI doesn't decide who counts — the
law does, in code you can read." Do not collapse these two steps for speed.

### 6.3 Follow-up logic

When a clause resolves `unclear` after first pass, the agent asks **one** targeted,
pre-templated follow-up question (per clause type — hardcode these, don't try to make
this fully dynamic under time pressure), then re-runs extraction on the combined
transcript. If still unclear after one follow-up, it stays `unclear` — that is a valid,
honest final state, not a bug.

### 6.4 Hard cases (build explicitly, these are cheap and highly visible to judges)

- **Under-15 detected →** interview stops immediately, flags, never counts. Test this
  live against a scripted persona.
- **Contradicts employer figure →** logged to `hard_case_flags`, never auto-resolved,
  surfaces on the dashboard as a discrepancy.
- **Refusal →** recorded as refused/`unclear`, never as a silent null.

---

## 7. Why the UI carries most of the weight (read this before writing any frontend code)

The judges will remember what they saw, not what's in the codebase. Most of the actual
"work" of impressing them happens on screen. Two screens matter:

### Screen A — Live Interview (phone-sized, this is what's on stage)

- Must render at true phone width (375–414px), not desktop-retrofitted.
- Live streaming transcript as the person speaks — even a simple typed-reveal effect
  reads as "alive" on stage. Don't wait for the full transcript to render at once.
- Each clause shown as a small live-updating card/badge as it resolves — met (green),
  not_met (red), unclear (amber) — so the audience watches the record build in real
  time, not just at the end.
- When the agent asks a follow-up (Abel's case), visibly show *why* — surface the
  ambiguous quote next to the follow-up question. This is the moment that sells "we
  don't guess."
- Consent capture is visible and explicit in the UI, not implied.

### Screen B — Monitoring Dashboard (this is Hiwot's screen, and the judges' second
impression)

- A real table: worker-reported vs employer-reported, side by side, per company/job
  position.
- Discrepancies visually flagged (red/amber row highlight) — this comparison is the
  single most "enterprise software" moment in the whole app; it should look like
  something a donor would actually accept as evidence, not a hackathon table.
- Confidence shown as a small badge per clause, not a raw decimal.
- SDG tags rendered as small chips per record.
- A summary strip at top: N companies, N beneficiaries interviewed, N discrepancies
  found, N hard cases flagged — give judges a number to remember.
- Populated with 20+ pre-seeded synthetic records before the live demo even starts, so
  the dashboard already has visible weight when the live interview's row lands in it.

General UI bar: shadcn/ui components, restrained color palette, real empty/loading
states, no placeholder lorem ipsum anywhere visible during the demo. This should look
like software a donor-funded programme would actually procure — not a weekend project.

---

## 8. Phased execution plan (mapped to the actual event clock)

### ✅ Phase 0 — Tonight (before Day 1) — COMPLETE
- Scaffold repo: Laravel + Inertia + React + TypeScript + Tailwind 4 + shadcn/ui,
  Postgres migrated empty.
- Deploy target live and reachable now — confirm before you sleep.
- Full data model migrations written (§6.1) — do not touch schema during sprints.
- Both persona scripts (Selam, Abel) written out fully as literal dialogue.
- Addis AI STT/TTS smoke-tested standalone against Abel's actual lines.
- First commit pushed tonight — see §9.

### ✅ Phase 1 — Sprint 1, Sat 10:30–13:00 (2.5h): the spine, text-only — COMPLETE
Extraction → rule-engine → verdict pipeline proven on typed/pasted transcripts.
Both persona scripts confirmed: Selam resolves clean, Abel's hours clause resolves
`unclear`. Aggregation function producing `sheet_rows` with a seeded employer number.

### ✅ Phase 2 — Lunch, Sat 13:00–13:45: seed data — COMPLETE
~20 synthetic transcripts generated and batch-run through the pipeline, populating
`sheet_rows` ahead of UI work.

### ✅ Phase 3 — Sprint 2, Sat 13:45–15:30 (1.75h): voice layer + hard cases — COMPLETE
Addis AI voice loop wired (STT → extraction → follow-up templated question via TTS →
re-extract), hard-case detection tested (under-15 stop, contradiction flag, refusal
handling), both live personas bound to real mic input on the phone-sized view.

### ✅ Phase 4 — Deep work, Sat 16:00–17:00: dry-run fixes — COMPLETE
Saturday mid-checkpoint dry run completed; issues found in that run were fixed here.

### 🔶 Phase 5 — Sunday final sprint, 09:30–13:00: demo polish — IN PROGRESS

**This is the current phase — everything below is what's left.**
1. Dashboard visual polish per §7 Screen B.
2. Live transcript streaming effect finalized per §7 Screen A.
3. SDG tags wired in.
4. Full pitch rehearsal (5 min): open on Hiwot's problem → live Abel interview showing
   the follow-up probe → cut to dashboard populating with the 20+ seeded records →
   close on the under-15 hard-stop demo.
5. Fallback: a pre-recorded interview video ready to play instantly if live mic fails
   on stage — never let the demo die on silence.

**Remaining checklist for Phase 5 (work top to bottom, stop early if time runs out —
items are ordered by judge-visible impact):**

- [ ] Dashboard (Screen B) visual pass: discrepancy row highlighting, confidence badges,
  SDG chips, summary strip numbers — §7 Screen B
- [ ] Live interview (Screen A) visual pass: streaming transcript reveal, live clause
  badges, ambiguous-quote-next-to-follow-up UI — §7 Screen A
- [ ] SDG tags (8.5, 8.6, 8.8, 5.5, 1.2) wired into `clause_assessments.sdg_tags`
- [ ] Set the real ETB minimum wage figure in `ClauseRuleEngine` (was a placeholder —
  see `IMPLEMENTATION.md` §3) — or keep `min_wage` honestly `unclear` and say so on stage
- [ ] Record the fallback video (Abel or Selam, full interview, in case live mic fails)
- [ ] Full pitch rehearsal, timed to 5 minutes, at least twice
- [ ] `README.md` written per §9 below, if not already done
- [ ] Final deploy + smoke test on the actual pitch device/wifi, not just localhost

---

## 9. Git / GitHub hygiene (you are being tracked on this)

Since commit history is part of what's judged, treat it as a deliverable, not an
afterthought:

- **Commit early tonight** (Phase 0 scaffold), so history shows a real start point
  before the clock starts, not a single midnight-Sunday dump.
- **Commit at the end of every phase**, not just at the end of the day — each phase in
  §8 should correspond to one or more real, descriptively-messaged commits
  (e.g. `feat: deterministic clause rule engine`, `feat: amharic voice loop + follow-up
  questions`, `fix: under-15 hard stop`).
- Use conventional commit prefixes (`feat:`, `fix:`, `chore:`, `refactor:`) — reads as
  professional discipline to anyone skimming the repo.
- Write a real `README.md` (separate from this file) with problem statement, screenshot,
  setup instructions, and architecture diagram — assume a judge will open the repo on
  their own before/after the pitch.
- No `wip`, `asdf`, `final_final` commit messages. No committing `.env` or credentials.
- If working with a teammate, use actual branches + PRs even under time pressure — a
  repo with only one contributor and one commit looks like a one-person weekend
  project, which undercuts the "enterprise software" narrative you're going for.

---

## 10. Non-negotiables checklist

- [ ] Deployed and reachable, not localhost-only
- [ ] Deterministic rule engine computes final verdicts, not the LLM
- [ ] `unclear` is preserved as an honest outcome, never silently guessed
- [ ] Under-15 hard stop tested live
- [ ] Employer vs worker comparison visible and flagged on dashboard
- [ ] 20+ aggregated records visible before the live demo starts
- [ ] One live, unseen interview run in front of judges
- [ ] Fallback video ready if live mic fails
- [ ] Phone-sized viewport throughout, not desktop retrofitted
- [ ] Commit history shows real phased progress, conventional messages, real README

---

## 11. Notes for the AI coding assistant

- Always implement §6.2's extraction/verdict split as two separate functions/services —
  never let a single LLM call output the final clause status.
- When in doubt about scope, check §3 before adding anything — this list is deliberately
  short for a 2-day build.
- UI work in §7 is not lower priority than backend logic — budget real time for it per
  the phase plan in §8, especially Phase 5.
- Prefer shadcn/ui primitives over hand-rolled components to keep the enterprise look
  achievable in the time available.
- Every commit should be meaningful and phase-aligned per §9 — do not batch unrelated
  changes into one commit for convenience.
