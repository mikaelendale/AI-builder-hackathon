# "Ask the People the Programme Is For" — Beneficiary Voice Verification Platform
### AI Builder Hackathon Addis Ababa, 29–30 Aug 2026 · Challenge 3 (sequa Ethiopia)

[![Laravel](https://img.shields.io/badge/Laravel-13.x-FF2D20?style=for-the-badge&logo=laravel)](https://laravel.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org)
[![Inertia.js](https://img.shields.io/badge/Inertia.js-v2-9553E9?style=for-the-badge&logo=inertia)](https://inertiajs.com)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-64%20Passed%20(270%20assertions)-emerald?style=for-the-badge&logo=checkmarx)](https://phpunit.de/)

---

## 1. Executive Summary & Problem Statement

Development programmes in Ethiopia report "Good Jobs Created" every six months via employer-filled spreadsheets: headcount, gender, age band, average monthly salary, training participation, and improvement criteria. **Nobody ever asks the workers themselves.**

A statutory **"Good Job"** under Ethiopian labour proclamation and international development guidelines requires meeting **7 statutory criteria**:
1. **Age 15+ Threshold** (`age_15_plus`): Worker verified $\ge$ 15 years old.
2. **Duration & Intensity** (`hours_threshold`): $\ge$ 20 hours/week over 26 weeks, OR 520 hours/year.
3. **Minimum Wage** (`min_wage`): Payment meets or exceeds statutory baseline ($\ge$ 1,500 ETB/month).
4. **Zero Child Labour** (`no_child_labor`): Full compliance with ILO Conventions 138 & 182.
5. **No Forced Labour / Coercion** (`no_forced_labor`): Voluntary employment with freedom of movement.
6. **Non-Discrimination & Equal Pay** (`no_discrimination`): Equal pay for equal work, fair treatment across genders.
7. **Freedom of Association** (`freedom_of_association`): Right to join workplace committees and unions.

For daily and seasonal workers, the guidelines state that employment must be confirmed *"either by employer or worker"* — a rule that was previously impossible to enforce at scale.

**This platform solves that problem through automated, multi-lingual, multi-agent voice audits.**

---

## 2. Multi-Agent Architecture: Separation of Extraction & Verdict

The system enforces a strict architectural boundary: **AI extracts claims and source quotes; plain deterministic PHP applies statutory rules.**

```
                               ┌────────────────────────────────────────────────────────┐
                               │   Spoken Audio / Transcript (EN / አማርኛ / Afaan Oromoo) │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │             InterviewSupervisorAgent (LLM)             │
                               │        Coordinates 2 specialist sub-agents in parallel │
                               └─────────────┬────────────────────────────┬─────────────┘
                                             │                            │
                                             ▼                            ▼
                 ┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
                 │       EmploymentFactsAgent (LLM)     │     │     RightsProtectionsAgent (LLM)     │
                 │   Extracts age, hours, wage metrics  │     │   Extracts child labor, forced labor,│
                 │   with raw signals & source quotes   │     │   discrimination, association rights │
                 └───────────────────┬──────────────────┘     └───────────────────┬──────────────────┘
                                     │                                            │
                                     └─────────────────────┬──────────────────────┘
                                                           │
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │             ExtractionVerifierAgent (Critic)           │
                               │   Temperature=0 fact-check against raw transcript text.│
                               │   Flags hallucinations; drops confidence on mismatch.  │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │              ClauseRuleEngine (Plain PHP)              │
                               │   Deterministic statutory evaluation.                  │
                               │   • Confidence floor: flags UNCLEAR if conf < 0.55     │
                               │   • Safety interlock: halts interview if age < 15      │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                                ┌──────────────────────────┴──────────────────────────┐
                                │                                                     │
                                ▼                                                     ▼
    ┌───────────────────────────────────────────────┐     ┌───────────────────────────────────────────────┐
    │     Screen A: Live Voice Audit Simulator      │     │         Screen B: Monitoring Dashboard        │
    │  • Smartphone Mockup (380px) & 2G IVR Mode    │     │  • Employer vs. Worker Reconciliation         │
    │  • Addis AI Voice (Amharic & Afaan Oromoo)    │     │  • "Ask the Ledger" Natural-Language Search   │
    │  • Context-Aware Follow-Up ("Heard: '...'")   │     │  • Tamper-Evident SHA-256 Chained Digest      │
    │  • Live Agent Trace Observability Panel       │     │  • 23 Cohort Enterprise Master Ledger         │
    └───────────────────────────────────────────────┘     └───────────────────────────────────────────────┘
```

> **Why this matters to donors & evaluators:**  
> The AI never decides who counts — the law does. If worker testimony is ambiguous, the system never hallucinates; it surfaces `unclear`, asks a targeted follow-up quoting the ambiguous phrase, and maintains honest audit fidelity.

---

## 3. Four Multi-Lingual Benchmark Personas

| Persona | Language | Job / Sector | Profile & Test Case | System Behaviour |
| :--- | :--- | :--- | :--- | :--- |
| **Selam Tesfaye** | **English** (`en`) | Call Centre Agent, Addis Ababa | 22 yrs old, 40 hrs/wk, 6,500 ETB monthly, direct bank deposit, union committee. | **Clean Case**: All 7 clauses resolve `MET`. Zero follow-up needed. Verifier-critic confirms source quotes. |
| **Abel Kebede** | **Amharic** (`am`) | Construction Labourer, Adama | 19 yrs old, cash daily pay, started *"after the rains"* (`ከክረምቱ በኋላ`). | **Ambiguous Case**: `hours_threshold` resolves `UNCLEAR`. Supervisor generates context-aware follow-up echoing quote. |
| **Almaz Tolessa** | **Afaan Oromoo** (`om`) | Textile Operator, Adama / Oromia | 22 yrs old, textile spinning, started *"rooba booda"* (after the rains). | **Afaan Oromoo Benchmark**: Addis AI Voice (`om-default`), echoes *"rooba booda" jettanii naaf himtan —*, clarifies to 40 hrs/wk. |
| **Yordanos Girma** | **English** (`en`) | Biscuit Packaging Assistant | 14 yrs old helper after school hours. | **Safety Hard Stop**: Under-15 detected $\rightarrow$ immediate interview shutdown, hard-stop flag logged, zero count toward programme figures. |

---

## 4. Key Capabilities & Innovations

### 🎙️ 1. Multi-Lingual Voice Pipeline (Addis AI & OpenAI)
- **Addis AI Addis Voices 2**: Native Ethiopian STT and TTS support for **Amharic** (`am-hamen`) and **Afaan Oromoo** (`om-default`).
- **OpenAI Fallback**: Whisper-1 speech recognition and Alloy TTS for English voice interviews.
- **Web Speech API Streaming**: Live browser microphone streaming with interim speech bubbles and volume waveform bars.

### 🧠 2. Context-Aware Follow-Up Probes ("Conversational Echo")
- Instead of generic follow-up questionnaires, the supervisor echoes the beneficiary's exact ambiguous quote:
  - **English**: *"You mentioned \"after the rains\" — about how many hours do you work in a typical week...?"*
  - **Amharic**: *«ከክረምቱ በኋላ» እንዳሉ ሰምቻለሁ — በተለመደው ሳምንት ውስጥ በግምት ስንት ሰዓት ይሰራሉ...?*
  - **Afaan Oromoo**: *"rooba booda" jettanii naaf himtan — Torbanitti saʼaatii meeqa hojjettu...?*
- Visual **`Heard: '...'`** chip appears above the follow-up prompt bubble.

### 🔍 3. "Ask the Ledger" — Natural-Language Search
- Query the master database in natural language (e.g., *"show disputed cases"*, *"under-15 safety hard stops"*, *"Afaan Oromoo textile operators"*, *"100% verified good jobs"*).
- Backed by `LedgerQueryAgent` structured parsing with deterministic fallback for instant response times.
- Real-time conversational summary banner with 1-click filter reset.

### 📊 4. Live Agent Trace Observability Panel
- LangSmith/Langfuse-style trace panel rendered side-by-side with the interview view.
- Visualizes supervisor fan-out, quantitative vs rights specialist timings, and verifier-critic reflection flags in real time.

### 📱 5. Feature-Phone 2G IVR Simulator (`/demo/feature-phone`)
- Simulates low-cost Nokia / Itel feature phones used by informal and rural workers.
- Authentic **DTMF Dual-Tone Multi-Frequency** audio generator using Web Audio API oscillators.
- Instant toggle between **Ge'ez Fidel** (ፊደል) and **Latin Script (Qubee)** orthography.

### 🤝 6. Bilateral Confirmation & Dispute Reconciliation
- Employer magic-link portal (`/employer/confirm/{token}`) to verify hours and contract duration.
- Classifies discrepancies into 4 transparent categories: `both_agree`, `both_disagree` (clawback candidate), `worker_only`, and `employer_only`.

### 🔐 7. Tamper-Evident Cryptographic Evidence Pack
- Chained **HMAC-SHA256** hash digest tree over all 23 beneficiary audits.
- Downloadable signed `.json` evidence pack (`/dashboard/evidence-pack`) preserving zero-PII audit proofs for international donor evaluation.

### 🌓 8. Full Light & Dark Mode Compatibility
- Built with Tailwind CSS v4 semantic design tokens, verified across all pages, badges, drawer tabs, and modal dialogues.

---

## 5. Project Structure

```
├── app/
│   ├── Ai/Agents/
│   │   ├── InterviewSupervisorAgent.php   # Coordinates worker extraction agents
│   │   ├── EmploymentFactsAgent.php       # Specialist: Age, hours, wage metrics
│   │   ├── RightsProtectionsAgent.php     # Specialist: Rights, discrimination, union
│   │   ├── ExtractionVerifierAgent.php    # Critic: Fact-checks quotes against transcript
│   │   └── LedgerQueryAgent.php           # Natural-language search translation
│   ├── Http/Controllers/
│   │   ├── DashboardController.php        # Master ledger & AI query endpoint
│   │   ├── InterviewController.php        # Voice converse, extraction, & speech synthesis
│   │   └── EmployerConfirmationController.php # Magic-link bilateral confirmation
│   ├── Models/
│   │   ├── Beneficiary.php                # Worker identity & language (en, am, om)
│   │   ├── Interview.php                  # Voice audit transcripts & trace events
│   │   ├── ClauseAssessment.php           # 7 statutory clause verdicts & quotes
│   │   ├── SheetRow.php                   # Master ledger aggregate row
│   │   ├── AgentTraceEvent.php            # Multi-agent observability events
│   │   └── HardCaseFlag.php               # Compliance safety interlock flags
│   └── Services/
│       ├── AddisAiVoice.php               # Addis AI STT, TTS (am/om), and Translation
│       ├── ClauseRuleEngine.php           # Authoritative deterministic labor rules
│       ├── FollowUpQuestions.php          # Context-aware follow-up question engine
│       ├── EvidencePackGenerator.php      # HMAC-SHA256 chained digest generator
│       └── SheetAggregator.php            # Bilateral reconciliation & rollup
├── database/
│   ├── migrations/                        # Full schema definitions
│   └── seeders/SyntheticInterviewSeeder.php # 23 enterprise cohort records & traces
├── resources/js/
│   ├── pages/
│   │   ├── dashboard.tsx                  # Master ledger, "Ask the Ledger", audit drawer
│   │   ├── interview.tsx                  # Phone viewport, live trace, benchmark cards
│   │   ├── feature-phone-simulator.tsx    # 2G DTMF IVR simulator
│   │   └── employer-confirm.tsx           # Employer confirmation magic-link view
│   └── components/
│       ├── agent-trace.tsx                # Live LangSmith-style trace inspector
│       ├── continuity-timeline.tsx        # 6-month checkpoint timeline
│       └── mockups/phone-mockup-card.tsx  # Dynamic Island smartphone mockup
└── routes/web.php                         # Application route definitions
```

---

## 6. Quickstart & Installation

### Prerequisites
- **PHP 8.3+** with SQLite / MySQL / PostgreSQL extension
- **Composer**
- **Node.js 20+** and **npm**

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone https://github.com/mikaelendale/AI-builder-hackathon.git
cd AI-builder-hackathon

# 2. Install PHP and JavaScript dependencies
composer install
npm install

# 3. Configure environment
cp .env.example .env
php artisan key:generate

# 4. Run database migrations & seed 23 cohort enterprises + 117 multi-agent trace events
php artisan migrate:fresh --seed

# 5. Build frontend assets
npm run build

# 6. Start the local server
php artisan serve
```

### Environment Variables (Optional for Live AI APIs)

To enable live LLM extraction and Addis AI voice streaming, set the following keys in your `.env`:

```env
# Addis AI Voice (Amharic & Afaan Oromoo STT/TTS)
ADDIS_API_KEY=your_addis_ai_key_here

# Groq (Fast Llama-3.3-70B Multi-Agent Execution)
GROQ_API_KEY=your_groq_api_key_here

# OpenAI (Whisper & Alloy Voice)
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic Claude (Optional)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

*(Note: The system includes deterministic local heuristic extractors, rule engines, and search parsers, running 100% offline out-of-the-box even without API keys.)*

---

## 7. 5-Minute Live Pitch Playbook (Judge Win Condition)

1. **Minute 1: The Problem (M&E Officer Hiwot's View)**
   - Open [`/dashboard`](http://localhost:8000/dashboard).
   - Show the reality of 23 partner enterprises reporting 100% "Good Jobs Created" via unverified employer sheets.
   - Point out the discrepancy column: before this platform, nobody asked the worker.

2. **Minute 2: The Clean Benchmark (Selam Tesfaye — English)**
   - Navigate to [`/interview`](http://localhost:8000/interview).
   - Trigger **Selam Tesfaye** (Call Centre Agent, Addis Ababa).
   - Show all 7 statutory criteria resolving `100% Verified` with Verifier-Critic reflection confirmed in the live trace panel.

3. **Minute 3: The Ambiguity Probe & Context-Aware Echo (Abel Kebede — Amharic)**
   - Trigger **Abel Kebede** (Construction Daily Labourer, Adama).
   - The extraction critic flags relative duration (*"after the rains"* / *«ከክረምቱ በኋላ»*).
   - The supervisor issues a context-aware follow-up probe echoing the phrase: *«ከክረምቱ በኋላ» እንዳሉ ሰምቻለሁ — በተለመደው ሳምንት ውስጥ በግምት ስንት ሰዓት ይሰራሉ?*
   - Click the clarification button to resolve hours to 35 hrs/wk.

4. **Minute 4: Afaan Oromoo Voice & 2G IVR Mode (Almaz Tolessa)**
   - Switch language to **Afaan Oromoo** and trigger **Almaz Tolessa**.
   - Show native Addis AI Voice synthesis (`om-default`) and context-aware follow-up (*"rooba booda" jettanii naaf himtan —*).
   - Briefly switch to [`/demo/feature-phone`](http://localhost:8000/demo/feature-phone) to show the 2G DTMF keypad interface.

5. **Minute 5: The Safety Hard Stop, "Ask the Ledger", & Evidence Pack**
   - Trigger **Yordanos Girma** (14 yrs old minor) $\rightarrow$ instant red compliance shutdown.
   - Return to [`/dashboard`](http://localhost:8000/dashboard).
   - Type in *"show disputed cases"* in **Ask the Ledger** to instantly surface the 7 clawback records.
   - Click **Signed Evidence Pack (.json)** to show the HMAC-SHA256 cryptographic audit trail.

---

## 8. Test Suite & Verification

The test suite includes unit and integration tests covering multi-agent extraction, rule evaluation, bilateral confirmation, and hash chaining.

```bash
# Run PHPUnit test suite
php artisan test
```

**Results**: `64 tests passed, 270 assertions (100% pass rate)`.

---

## 9. Technology Stack

- **Backend**: Laravel 13, PHP 8.3, SQLite / PostgreSQL
- **Frontend**: React 19, Inertia.js v2, Tailwind CSS v4, TypeScript 5, Lucide React
- **AI & Multi-Agent**: Laravel AI, Groq Llama-3.3-70B, OpenAI GPT-4o-mini & Whisper, Anthropic Claude 3.5 Sonnet
- **Voice & Speech**: Addis AI Addis Voices 2 (`am`, `om`), Web Audio API DTMF Synthesizer
- **Security & Integrity**: HMAC-SHA256 chained hash digests, CSRF protection

---

## 10. License

MIT License — Developed for the **sequa Ethiopia AI Builder Hackathon 2026**.

