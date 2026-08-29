# "Ask the People the Programme Is For" — Beneficiary Verification Platform
### AI Builder Hackathon Addis Ababa, 29–30 Aug 2026 · Challenge 3 (sequa Ethiopia)

[![Laravel](https://img.shields.io/badge/Laravel-13.x-FF2D20?style=for-the-badge&logo=laravel)](https://laravel.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org)
[![Inertia.js](https://img.shields.io/badge/Inertia.js-v2-9553E9?style=for-the-badge&logo=inertia)](https://inertiajs.com)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

---

## 1. Executive Summary & Problem

Job-creation programmes currently report "good jobs created" every six months using an employer-filled monitoring sheet: headcount, gender, age band, average monthly salary, training participation, and seven improvement criteria. **Nobody ever asks the worker.**

A "good job" is defined under strict statutory guidelines:
- **Age 15 or older** (`age_15_plus`)
- **Formal or informal work**
- **20 hours/week over 26 weeks, OR 520 hours/year** (`hours_threshold`)
- **At least the legally established minimum wage** (`min_wage`)
- **No child labour** (`no_child_labor`)
- **No forced labour or coercion** (`no_forced_labor`)
- **No discrimination or harassment** (`no_discrimination`)
- **Freedom of association & union representation** (`freedom_of_association`)

For daily and seasonal workers, the clause counts only above 6 months of continuous employment, confirmed *"either by employer or worker"* — a rule that exists in programme guidelines but was impossible to enforce at scale.

**This platform opens that door.**

---

## 2. Core Architecture: The Extraction / Verdict Split

```
                         ┌─────────────────────────────────────────┐
                         │   Spoken Audio / Transcript (EN / AM)   │
                         └────────────────────┬────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │       ClauseExtractionAgent (LLM)       │
                         │  Extracts raw_signal, evidence_quote,   │
                         │  and confidence ONLY. NEVER verdicts.   │
                         └────────────────────┬────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │     ClauseRuleEngine (Plain PHP)        │
                         │  Deterministic statutory rule engine.   │
                         │  Forces UNCLEAR if confidence < 0.55.   │
                         │  Hard-stops if age < 15 detected.       │
                         └────────────────────┬────────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     │                                                 │
                     ▼                                                 ▼
        ┌─────────────────────────┐                       ┌─────────────────────────┐
        │  Live Phone Interview   │                       │  Monitoring Dashboard   │
        │  (Screen A — 390px)     │                       │  (Screen B — Hiwot's)   │
        │  - Streaming transcript │                       │  - Employer vs Worker   │
        │  - Real-time clause card│                       │  - Discrepancy flags    │
        │  - Follow-up probes     │                       │  - 23+ seeded records   │
        │  - Under-15 hard stop   │                       │  - Verbatim audit trail │
        └─────────────────────────┘                       └─────────────────────────┘
```

> **Why this matters to donors & judges:**
> The AI does not decide who counts — the law does, in transparent code you can audit. If signal is ambiguous, the system never silently hallucinates; it flags `unclear`, triggers one targeted probe, and preserves `unclear` as an honest outcome.

---

## 3. Demo Personas

1. **Selam Tesfaye (22, Addis Ababa)**: English, placed in a call centre 6 months ago. 40 hrs/wk, 6500 ETB salary, pension deducted, full freedom of association. **Clean Case**: all 7 clauses resolve `met`.
2. **Abel Kebede (19, Adama)**: Amharic, construction daily worker paid cash. Started "after the rains" (relative duration). **Ambiguous Case**: `hours_threshold` resolves `unclear` with targeted follow-up probe ("We don't guess").
3. **Yordanos Girma (14, Packaging)**: Minor case. **Under-15 Hard Stop**: instant interview termination, hard case flag logged, zero count toward programme figures.
4. **Hiwot (34, Monitoring Officer)**: Uses the dashboard to cross-reference employer sheets against 23+ verified beneficiary interviews and defend audit figures to donor evaluators.

---

## 4. Key Features

- **Live Phone Viewport (Screen A)**: Built to true phone width (390px) with live typed-reveal transcript streaming and real-time clause badge updates.
- **Enterprise Monitoring Dashboard (Screen B)**: Side-by-side comparison of employer-reported numbers vs worker realities, visual discrepancy highlights, SDG chips (`SDG 8.5`, `8.6`, `8.8`, `5.5`, `1.2`), and full verbatim evidence audit trail.
- **23+ Pre-Seeded Realistic Records**: Immediate operational depth covering garment, leather, agriculture, tech hub, automotive, and hospitality workers across Addis Ababa, Hawassa, Adama, Dire Dawa, Jimma, and Bahir Dar.
- **Under-15 Immediate Hard Stop**: Automated compliance safeguard protecting donor programme integrity.

---

## 5. Quick Start & Setup

### Prerequisites
- PHP 8.3+ with SQLite/PostgreSQL
- Composer
- Node.js 20+ & npm

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/mikaelendale/AI-builder-hackathon.git
cd AI-builder-hackathon

# 2. Install PHP and JS dependencies
composer install
npm install

# 3. Setup environment and database
cp .env.example .env
php artisan key:generate
php artisan migrate --force

# 4. Seed 23+ realistic beneficiary verification records
php artisan db:seed

# 5. Build frontend assets
npm run build

# 6. Start the local server
php artisan serve
```

Open [http://localhost:8000/dashboard](http://localhost:8000/dashboard) to view the Monitoring Dashboard or [http://localhost:8000/interview](http://localhost:8000/interview) for the live phone interview simulator.

---

## 6. 5-Minute Pitch Rehearsal Flow (Judge Win Condition)

1. **Minute 1: The Problem (Hiwot's view)**
   - Open on Hiwot's reality: filing 6-month sheets for 23 partner enterprises using unverified employer numbers.
   - Show the initial dashboard loaded with 23+ pre-seeded records, highlighting that nobody had a scalable way to ask the actual workers.
2. **Minute 2: The Clean Benchmark (Selam)**
   - Switch to the Phone Viewport ([`/interview`](http://localhost:8000/interview)).
   - Demonstrate Selam's persona (Call Centre Agent, Addis Ababa) resolving all 7 statutory clauses as `MET` in real-time.
3. **Minute 3: The Ambiguity Probe (Abel — "We Don't Guess")**
   - Run Abel's Amharic voice interview (*"started after the rains"*).
   - Show `hours_threshold` resolving `UNCLEAR` with the exact ambiguous quote surfaced on screen.
   - Show the agent asking the targeted follow-up probe and re-evaluating cleanly.
4. **Minute 4: The Under-15 Hard Stop (Yordanos)**
   - Run Yordanos (14 years old). Show immediate red alert hard stop, automated termination, and zero rollup into good job totals.
5. **Minute 5: The Aggregate Discrepancy Rollup (Donor Defense)**
   - Return to the Dashboard ([`/dashboard`](http://localhost:8000/dashboard)).
   - Show how independent beneficiary voice audits reveal discrepancies against employer claims, giving Hiwot an undeniable audit trail that survives donor scrutiny.

---

## 7. Running Tests

```bash
php artisan test
```

All 48 feature and unit tests run with 100% pass rate (167 assertions).

---

## 8. License

MIT License — sequa Ethiopia AI Builder Hackathon 2026.
