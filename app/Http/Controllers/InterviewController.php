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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InterviewController extends Controller
{
    public function __construct(
        private ClauseRuleEngine $ruleEngine,
        private FollowUpQuestions $followUps,
        private SheetAggregator $aggregator,
    ) {}

    public function create(): Response
    {
        $beneficiaries = Beneficiary::latest()->get();

        return Inertia::render('interview', [
            'beneficiaries' => $beneficiaries,
            'interview' => null,
        ]);
    }

    public function show(Interview $interview): Response
    {
        $interview->load(['beneficiary', 'clauseAssessments', 'hardCaseFlags', 'sheetRow']);

        return Inertia::render('interview', [
            'beneficiaries' => Beneficiary::latest()->get(),
            'interview' => $interview,
        ]);
    }

    public function start(Request $request, Beneficiary $beneficiary): JsonResponse
    {
        $consentGiven = $request->boolean('consent_given', true);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'in_progress',
            'consent_given' => $consentGiven,
            'started_at' => now(),
        ]);

        if (! $consentGiven) {
            HardCaseFlag::create([
                'interview_id' => $interview->id,
                'type' => 'refusal',
                'detail' => 'Beneficiary refused verbal consent for interview assessment.',
                'resolved_action' => 'Clauses marked unclear. Excluded from positive employment totals.',
            ]);

            // Populate all 7 clauses as unclear (never silent null)
            $clauses = ['age_15_plus', 'hours_threshold', 'min_wage', 'no_child_labor', 'no_forced_labor', 'no_discrimination', 'freedom_of_association'];
            foreach ($clauses as $clauseKey) {
                ClauseAssessment::create([
                    'interview_id' => $interview->id,
                    'clause_key' => $clauseKey,
                    'status' => 'unclear',
                    'confidence' => 0.0,
                    'evidence_quote' => 'Verbal consent refused by beneficiary.',
                ]);
            }
        }

        return response()->json([
            'interview_id' => $interview->id,
            'interview' => $interview->load('beneficiary'),
        ]);
    }

    /**
     * Quick-create a beneficiary and immediately start an interview (for custom/live personas)
     */
    public function quickCreateBeneficiary(Request $request): JsonResponse
    {
        $name = $request->input('name', 'Live Beneficiary');
        $lang = $request->input('language', 'en');
        $phoneType = $request->input('phone_type', 'smartphone');

        $beneficiary = Beneficiary::create([
            'name' => $name,
            'persona_type' => 'synthetic',
            'phone_type' => $phoneType,
            'language' => $lang,
        ]);

        $interview = Interview::create([
            'beneficiary_id' => $beneficiary->id,
            'status' => 'in_progress',
            'consent_given' => true,
            'started_at' => now(),
        ]);

        return response()->json([
            'interview_id' => $interview->id,
            'beneficiary_id' => $beneficiary->id,
            'interview' => $interview->load('beneficiary'),
        ]);
    }

    public function submitTranscript(Request $request, Interview $interview): JsonResponse
    {
        $request->validate([
            'transcript' => 'required|string',
        ]);

        $newTranscript = trim($request->input('transcript'));
        $updatedTranscript = $interview->transcript_raw
            ? $interview->transcript_raw."\n".$newTranscript
            : $newTranscript;

        $interview->update([
            'transcript_raw' => $updatedTranscript,
        ]);

        $extracted = $this->extractSignals($updatedTranscript);
        $verdicts = $this->ruleEngine->evaluate($interview, $extracted);

        // Hard case: under-15 — stop immediately, flag, never count
        if (($verdicts['age_15_plus']['status'] ?? null) === 'not_met') {
            $interview->update([
                'status' => 'stopped_hard_case',
                'completed_at' => now(),
            ]);

            HardCaseFlag::create([
                'interview_id' => $interview->id,
                'type' => 'under_15',
                'detail' => $verdicts['age_15_plus']['reason'] ?? 'Beneficiary stated age under 15 years old.',
            ]);

            return response()->json([
                'stopped' => true,
                'reason' => 'under_15',
                'message' => 'Hard stop triggered: beneficiary is under 15. The interview has terminated and cannot count toward programme jobs.',
                'verdicts' => $verdicts,
                'transcript_raw' => $updatedTranscript,
            ]);
        }

        // Store clause assessments
        foreach ($verdicts as $clauseKey => $verdict) {
            ClauseAssessment::updateOrCreate(
                [
                    'interview_id' => $interview->id,
                    'clause_key' => $clauseKey,
                ],
                [
                    'status' => $verdict['status'],
                    'confidence' => $verdict['confidence'],
                    'evidence_quote' => $verdict['evidence_quote'] ?? null,
                    'raw_llm_output' => $extracted[$clauseKey] ?? null,
                    'sdg_tags' => $verdict['sdg_tags'] ?? [],
                ]
            );
        }

        $lang = $interview->beneficiary?->language ?? 'en';

        $followUpsNeeded = collect($verdicts)
            ->filter(fn ($v) => $v['status'] === 'unclear')
            ->keys()
            ->map(fn ($key) => [
                'clause_key' => $key,
                'question' => $this->followUps->forClause($key, $lang),
                'ambiguous_quote' => $verdicts[$key]['evidence_quote'] ?? null,
                'reason' => $verdicts[$key]['reason'] ?? 'Information ambiguous',
            ])
            ->filter(fn ($f) => $f['question'] !== null)
            ->values();

        return response()->json([
            'stopped' => false,
            'verdicts' => $verdicts,
            'follow_ups' => $followUpsNeeded,
            'transcript_raw' => $updatedTranscript,
        ]);
    }

    /**
     * Real-time back-and-forth conversational turn with auto-speech generation
     */
    public function converse(Request $request, Interview $interview): JsonResponse
    {
        $lang = $request->input('language', $interview->beneficiary?->language ?? 'en');
        $userText = trim($request->input('transcript', ''));

        // Check if browser-side live speech transcript was provided
        if (empty($userText) && $request->filled('interim_text')) {
            $userText = trim($request->input('interim_text'));
        }

        // 1. If userText is still empty and audio file is uploaded, transcribe with Addis AI (Amharic) or OpenAI Whisper (English)
        if (empty($userText) && $request->hasFile('audio')) {
            $audioFile = $request->file('audio');
            if (in_array($lang, ['am', 'om']) || $interview->beneficiary?->persona_type === 'abel') {
                $addis = app(\App\Services\AddisAiVoice::class);
                $transcription = $addis->transcribe($audioFile->getRealPath(), 'am');
                if (!empty($transcription)) {
                    $userText = trim($transcription);
                    $lang = 'am';
                }
            } else {
                $openAiKey = config('ai.providers.openai.key') ?? env('OPENAI_API_KEY');
                if ($openAiKey) {
                    try {
                        $res = \Illuminate\Support\Facades\Http::withToken($openAiKey)
                            ->attach('file', file_get_contents($audioFile->getRealPath()), 'audio.webm')
                            ->post('https://api.openai.com/v1/audio/transcriptions', [
                                'model' => 'whisper-1',
                                'response_format' => 'json',
                            ]);
                        if ($res->successful()) {
                            $userText = trim($res->json('text') ?? '');
                        }
                    } catch (\Throwable $e) {}
                }
            }
        }

        if (empty($userText)) {
            // Try to also auto-synthesize a retry prompt so the user hears it
            $retryText = $lang === 'am' ? 'እባክዎን እንደገና ይናገሩ...' : 'Could not hear clearly, please speak again...';
            $audioUrl = $this->synthesizeSpeech($retryText, $lang);

            return response()->json([
                'error' => 'No speech detected.',
                'agent_text' => $retryText,
                'audio_url' => $audioUrl,
                'retry' => true,
            ], 422);
        }

        // Auto-detect language if Amharic Fidel characters are in the text
        if (preg_match('/[\x{1200}-\x{137F}]/u', $userText)) {
            $lang = 'am';
        }

        // 2. Append to interview raw transcript
        $updatedTranscript = $interview->transcript_raw
            ? $interview->transcript_raw . "\n[Beneficiary]: " . $userText
            : "[Beneficiary]: " . $userText;

        $interview->update([
            'transcript_raw' => $updatedTranscript,
        ]);

        // 3. Extract signals & calculate deterministic rule engine verdicts
        $extracted = $this->extractSignals($updatedTranscript);
        $verdicts = $this->ruleEngine->evaluate($interview, $extracted);

        \Illuminate\Support\Facades\Log::info("[sequa-converse] Interview #{$interview->id} [lang={$lang}] Input: {$userText}");
        \Illuminate\Support\Facades\Log::info("[sequa-extraction] Extracted signals: " . json_encode($extracted));
        \Illuminate\Support\Facades\Log::info("[sequa-rule-engine] Computed verdicts: " . json_encode(array_map(fn ($v) => $v['status'], $verdicts)));

        // 4. Check Under-15 Hard Stop
        if (($verdicts['age_15_plus']['status'] ?? null) === 'not_met') {
            $interview->update([
                'status' => 'stopped_hard_case',
                'completed_at' => now(),
            ]);

            HardCaseFlag::firstOrCreate(
                ['interview_id' => $interview->id, 'type' => 'under_15'],
                ['detail' => $verdicts['age_15_plus']['reason'] ?? 'Beneficiary stated age under 15 years old.']
            );

            $agentText = $lang === 'am'
                ? 'ዕድሜዎ ከ15 ዓመት በታች በመሆኑ ቃለ-መጠይቁ እዚህ ላይ ተጠናቋል። እናመሰግናለን።'
                : 'As your age is under the legal threshold of 15, this verification interview has terminated immediately.';

            $audioUrl = $this->synthesizeSpeech($agentText, $lang);

            return response()->json([
                'user_text' => $userText,
                'agent_text' => $agentText,
                'audio_url' => $audioUrl,
                'stopped' => true,
                'is_complete' => true,
                'verdicts' => $verdicts,
                'transcript_raw' => $updatedTranscript,
            ]);
        }

        // Store clause assessments
        foreach ($verdicts as $clauseKey => $verdict) {
            ClauseAssessment::updateOrCreate(
                [
                    'interview_id' => $interview->id,
                    'clause_key' => $clauseKey,
                ],
                [
                    'status' => $verdict['status'],
                    'confidence' => $verdict['confidence'],
                    'evidence_quote' => $verdict['evidence_quote'] ?? null,
                    'raw_llm_output' => $extracted[$clauseKey] ?? null,
                    'sdg_tags' => $verdict['sdg_tags'] ?? [],
                ]
            );
        }

        // 5. Check if any clause is unclear and needs a targeted follow-up probe
        $unclearClause = collect($verdicts)->first(fn ($v) => $v['status'] === 'unclear');
        $unclearKey = collect($verdicts)->filter(fn ($v) => $v['status'] === 'unclear')->keys()->first();

        $followUpsNeeded = collect($verdicts)
            ->filter(fn ($v) => $v['status'] === 'unclear')
            ->keys()
            ->map(fn ($key) => [
                'clause_key' => $key,
                'question' => $this->followUps->forClause($key, $lang),
                'ambiguous_quote' => $verdicts[$key]['evidence_quote'] ?? null,
                'reason' => $verdicts[$key]['reason'] ?? 'Information ambiguous',
            ])
            ->filter(fn ($f) => $f['question'] !== null)
            ->values();

        if ($unclearKey) {
            $question = $this->followUps->forClause($unclearKey, $lang);
            $agentText = $question ?: ($lang === 'am' ? 'እባክዎን ተጨማሪ ማብራሪያ ይስጡ?' : 'Could you clarify that further?');
            $isComplete = false;
        } else {
            $agentText = $lang === 'am'
                ? 'እናመሰግናለን! ሁሉም 7 የሥራ ሁኔታ ማረጋገጫዎች በተሳካ ሁኔታ ተመዝግበዋል።'
                : 'Thank you! All 7 statutory employment conditions have been successfully verified and recorded.';
            $isComplete = true;
        }

        // 6. Synthesize speech for back-and-forth conversational AI audio
        $audioUrl = $this->synthesizeSpeech($agentText, $lang);

        return response()->json([
            'user_text' => $userText,
            'agent_text' => $agentText,
            'audio_url' => $audioUrl,
            'stopped' => false,
            'is_complete' => $isComplete,
            'verdicts' => $verdicts,
            'follow_ups' => $followUpsNeeded,
            'transcript_raw' => $updatedTranscript,
        ]);
    }

    private function synthesizeSpeech(string $text, string $lang): ?string
    {
        // For Amharic, use Addis AI Addis Voices 2
        if (in_array($lang, ['am', 'om']) && env('ADDIS_API_KEY')) {
            try {
                $addis = app(\App\Services\AddisAiVoice::class);
                $url = $addis->speak($text, 'am', 'am-hamen');
                if (!empty($url)) {
                    return $url;
                }
            } catch (\Throwable $e) {}
        }

        // For English, use OpenAI TTS
        $openAiKey = config('ai.providers.openai.key') ?? env('OPENAI_API_KEY');
        if ($lang === 'en' && $openAiKey) {
            try {
                $res = \Illuminate\Support\Facades\Http::withToken($openAiKey)->post('https://api.openai.com/v1/audio/speech', [
                    'model' => 'tts-1',
                    'input' => $text,
                    'voice' => 'alloy',
                    'response_format' => 'mp3',
                ]);
                if ($res->successful()) {
                    $base64 = base64_encode($res->body());
                    return "data:audio/mp3;base64,{$base64}";
                }
            } catch (\Throwable $e) {}
        }

        return null;
    }

    public function complete(Request $request, Interview $interview): JsonResponse
    {
        $interview->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        $beneficiary = $interview->beneficiary;
        $defaultJob = match ($beneficiary?->persona_type) {
            'selam' => 'Call Centre Agent',
            'abel' => 'Construction Daily Labourer',
            default => 'General Operator',
        };

        $sheetRow = $this->aggregator->aggregate($interview, [
            'job_position' => $request->input('job_position', $defaultJob),
            'gender' => $request->input('gender', $beneficiary?->persona_type === 'selam' ? 'Female' : 'Male'),
            'age_band' => $request->input('age_band', '15-24'),
            'monthly_salary_etb' => $request->input('monthly_salary_etb', 6500),
            'employer_reported_value' => $request->input('employer_reported_value', 1), // Employer claims 1 ("good job")
            'worker_reported_value' => $request->input('worker_reported_value'),
        ]);

        return response()->json([
            'status' => 'completed',
            'sheet_row' => $sheetRow,
        ]);
    }

    /**
     * Fallback structured extractor when AI key is not set or during local testing
     */
    private function extractSignals(string $transcript): array
    {
        try {
            $promptText = "Interview transcript:\n\n{$transcript}";

            if (config('ai.providers.openai.key')) {
                $response = (new ClauseExtractionAgent)
                    ->provider('openai')
                    ->model('gpt-4o-mini')
                    ->prompt($promptText);

                return $response->toArray();
            }

            if (config('ai.providers.groq.key')) {
                $response = (new ClauseExtractionAgent)
                    ->provider('groq')
                    ->model('llama-3.3-70b-versatile')
                    ->prompt($promptText);

                return $response->toArray();
            }

            if (config('ai.providers.anthropic.key') || config('ai.providers.gemini.key')) {
                $response = (new ClauseExtractionAgent)->prompt($promptText);

                return $response->toArray();
            }
        } catch (\Throwable $e) {
            // Fallback to local heuristic extraction for robust offline / test performance
        }

        return $this->heuristicExtraction($transcript);
    }

    private function heuristicExtraction(string $text): array
    {
        $lower = strtolower($text);

        // Age detection
        $ageConfidence = 0.4;
        $ageQuote = null;
        $ageSignal = 'Age not clearly stated';
        if (preg_match('/(\b(?:I am|I\'m|age is|aged|years old|ዕድሜዬ)\s*(\d{1,2})|\b(\d{1,2})\s*(?:years old|ዓመት))/iu', $text, $m)) {
            $ageVal = $m[2] ?: $m[3];
            $ageSignal = "Beneficiary stated age {$ageVal}";
            $ageQuote = $m[0];
            $ageConfidence = 0.95;
        }

        // Hours & duration
        $hoursConfidence = 0.4;
        $hoursQuote = null;
        $hoursSignal = 'Hours ambiguous';
        if (preg_match('/(\b\d+\s*hours?\s*(?:\/|\s*per\s*)?\s*week|\b\d+\s*hrs?\s*a\s*week|\d+\s*ሰዓት)/iu', $text, $m)) {
            $hoursSignal = "Works {$m[0]}";
            $hoursQuote = $m[0];
            $hoursConfidence = 0.92;
        } elseif (str_contains($lower, 'after the rains') || str_contains($lower, 'ከክረምቱ በኋላ') || str_contains($lower, 'few months') || str_contains($lower, 'casual')) {
            $hoursSignal = 'Relative duration stated: after the rains / uncertain months';
            $hoursQuote = 'after the rains';
            $hoursConfidence = 0.45; // Below 0.55 floor -> triggers unclear!
        }

        // Wage
        $wageConfidence = 0.85;
        $wageQuote = null;
        $wageSignal = 'Paid regular monthly salary';
        if (preg_match('/(\b\d{3,6}\s*(?:etb|birr|ብር))/iu', $text, $m)) {
            $wageSignal = "Paid {$m[0]}";
            $wageQuote = $m[0];
            $wageConfidence = 0.95;
        } elseif (str_contains($lower, 'cash') || str_contains($lower, 'daily')) {
            $wageSignal = 'Paid cash daily without fixed contract slip';
            $wageQuote = 'paid in cash';
            $wageConfidence = 0.70;
        }

        // Boolean clauses
        $childLaborSignal = (str_contains($lower, 'child labour') && !str_contains($lower, 'no child'))
            || (str_contains($lower, 'underage') && !str_contains($lower, 'no underage'))
            || str_contains($lower, 'started when 12') || str_contains($lower, 'started at 13') || str_contains($lower, 'started at 14')
            ? 'Possible minor start'
            : 'No child labour indicators found';
        
        $forcedLaborSignal = (str_contains($lower, 'forced') && !str_contains($lower, 'no forced') && !str_contains($lower, 'not forced'))
            || str_contains($lower, 'cannot leave') || str_contains($lower, 'locked') || str_contains($lower, 'coerced')
            ? 'Forced conditions present'
            : 'Voluntary employment with freedom of movement';

        $discriminationSignal = (str_contains($lower, 'discrim') && !str_contains($lower, 'no discrim'))
            || (str_contains($lower, 'harass') && !str_contains($lower, 'no harass') && !str_contains($lower, 'no discrimination or harass'))
            || (str_contains($lower, 'unequal') && !str_contains($lower, 'not unequal'))
            ? 'Discrimination reported'
            : 'Equal and fair treatment reported';

        $associationSignal = str_contains($lower, 'not allowed to join') || str_contains($lower, 'banned') || str_contains($lower, 'no union') || str_contains($lower, 'cannot join')
            ? 'Union/association denied'
            : 'Free to join workers group or union';

        return [
            'age' => ['raw_signal' => $ageSignal, 'evidence_quote' => $ageQuote, 'confidence' => $ageConfidence],
            'hours_and_duration' => ['raw_signal' => $hoursSignal, 'evidence_quote' => $hoursQuote, 'confidence' => $hoursConfidence],
            'wage' => ['raw_signal' => $wageSignal, 'evidence_quote' => $wageQuote, 'confidence' => $wageConfidence],
            'child_labor' => ['raw_signal' => $childLaborSignal, 'evidence_quote' => null, 'confidence' => 0.9],
            'forced_labor' => ['raw_signal' => $forcedLaborSignal, 'evidence_quote' => null, 'confidence' => 0.9],
            'discrimination' => ['raw_signal' => $discriminationSignal, 'evidence_quote' => null, 'confidence' => 0.9],
            'freedom_of_association' => ['raw_signal' => $associationSignal, 'evidence_quote' => null, 'confidence' => 0.9],
            'needs_followup_on' => $hoursConfidence < 0.55 ? ['hours_threshold'] : [],
        ];
    }
}
