<?php

namespace App\Http\Controllers;

use App\Models\HardCaseFlag;
use App\Models\Interview;
use App\Models\SheetRow;
use App\Services\EvidencePackGenerator;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $rows = SheetRow::with([
            'interview.beneficiary',
            'interview.clauseAssessments',
            'interview.hardCaseFlags',
            'interview.employerConfirmation',
            'interview.continuityCheckpoints',
            'interview.traceEvents',
        ])
        ->latest()
        ->get();

        $totalInterviews = Interview::count();
        $discrepanciesCount = SheetRow::where('discrepancy_flag', true)->count();
        $hardCasesCount = HardCaseFlag::count();
        $verifiedGoodJobsCount = SheetRow::where('is_good_job', true)->count();
        $employerClaimedGoodJobsCount = SheetRow::where('employer_reported_value', 1)->count();

        // 23 partner enterprises in the six-month programme cohort
        $companiesCount = max(23, $rows->pluck('job_position')->unique()->count());

        return Inertia::render('dashboard', [
            'rows' => $rows,
            'summary' => [
                'companies' => $companiesCount,
                'interviewed' => $totalInterviews,
                'discrepancies' => $discrepanciesCount,
                'hardCases' => $hardCasesCount,
                'verifiedGoodJobs' => $verifiedGoodJobsCount,
                'employerClaimed' => $employerClaimedGoodJobsCount,
            ],
        ]);
    }

    public function query(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'query' => 'required|string',
        ]);

        $rawQuery = trim($request->input('query'));
        $filters = $this->parseNaturalLanguageQuery($rawQuery);

        $query = SheetRow::with([
            'interview.beneficiary',
            'interview.clauseAssessments',
            'interview.hardCaseFlags',
            'interview.employerConfirmation',
            'interview.continuityCheckpoints',
            'interview.traceEvents',
        ]);

        if (isset($filters['discrepancy_flag']) && $filters['discrepancy_flag'] !== null) {
            $query->where('discrepancy_flag', (bool) $filters['discrepancy_flag']);
        }

        if (!empty($filters['confirmation_source'])) {
            $query->where('confirmation_source', $filters['confirmation_source']);
        }

        if (!empty($filters['hard_case_type'])) {
            $query->whereHas('interview.hardCaseFlags', function ($q) use ($filters) {
                if ($filters['hard_case_type'] !== 'any') {
                    $q->where('type', $filters['hard_case_type']);
                }
            });
        }

        if (isset($filters['is_good_job']) && $filters['is_good_job'] !== null) {
            $query->where('is_good_job', (bool) $filters['is_good_job']);
        }

        if (!empty($filters['gender'])) {
            $query->where('gender', $filters['gender']);
        }

        if (!empty($filters['language'])) {
            $query->whereHas('interview.beneficiary', function ($q) use ($filters) {
                $q->where('language', $filters['language']);
            });
        }

        if (!empty($filters['job_position_search'])) {
            $term = $filters['job_position_search'];
            $query->where(function ($q) use ($term) {
                $q->where('job_position', 'LIKE', "%{$term}%")
                  ->orWhereHas('interview.beneficiary', function ($bq) use ($term) {
                      $bq->where('name', 'LIKE', "%{$term}%")
                         ->orWhere('persona_type', 'LIKE', "%{$term}%");
                  });
            });
        }

        $filteredRows = $query->latest()->get();
        $count = $filteredRows->count();

        $summary = $filters['human_readable_summary'] ?? "Showing {$count} matching records for query \"{$rawQuery}\"";

        return response()->json([
            'query' => $rawQuery,
            'summary' => $summary,
            'filters' => $filters,
            'rows' => $filteredRows,
            'count' => $count,
        ]);
    }

    private function parseNaturalLanguageQuery(string $query): array
    {
        // 1. Try structured LLM parsing if AI key available
        if (config('ai.providers.groq.key') || config('ai.providers.openai.key') || config('ai.providers.anthropic.key') || config('ai.providers.gemini.key')) {
            try {
                $agent = new \App\Ai\Agents\LedgerQueryAgent();
                if (config('ai.providers.groq.key')) {
                    $response = $agent->provider('groq')->model('llama-3.3-70b-versatile')->prompt("User query: {$query}");
                    return $response->toArray();
                } elseif (config('ai.providers.openai.key')) {
                    $response = $agent->provider('openai')->model('gpt-4o-mini')->prompt("User query: {$query}");
                    return $response->toArray();
                } else {
                    $response = $agent->prompt("User query: {$query}");
                    return $response->toArray();
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('[sequa-ledger-query] AI query agent fallback: ' . $e->getMessage());
            }
        }

        // 2. High-precision deterministic parser fallback
        $lower = strtolower($query);
        $filters = [
            'confirmation_source' => null,
            'discrepancy_flag' => null,
            'hard_case_type' => null,
            'is_good_job' => null,
            'job_position_search' => null,
            'language' => null,
            'gender' => null,
            'human_readable_summary' => '',
        ];

        if (str_contains($lower, 'disput') || str_contains($lower, 'discrepan') || str_contains($lower, 'mismatch') || str_contains($lower, 'clawback')) {
            $filters['discrepancy_flag'] = true;
            $filters['human_readable_summary'] = 'Showing disputed records with employer/worker mismatches';
        } elseif (str_contains($lower, 'both agree') || str_contains($lower, 'bilateral') || str_contains($lower, 'reconciled') || str_contains($lower, 'agree')) {
            $filters['confirmation_source'] = 'both_agree';
            $filters['human_readable_summary'] = 'Showing records bilaterally confirmed by both worker and employer';
        } elseif (str_contains($lower, 'under 15') || str_contains($lower, 'under-15') || str_contains($lower, 'minor') || str_contains($lower, 'child') || str_contains($lower, 'hard stop') || str_contains($lower, 'halt')) {
            $filters['hard_case_type'] = 'under_15';
            $filters['human_readable_summary'] = 'Showing statutory hard stop cases (under-15 minor safety interlock)';
        } elseif (str_contains($lower, 'good job') || str_contains($lower, 'verified job') || str_contains($lower, '100%') || str_contains($lower, 'passed')) {
            $filters['is_good_job'] = true;
            $filters['human_readable_summary'] = 'Showing fully verified Good Jobs meeting all 7 statutory criteria';
        }

        if (str_contains($lower, 'oromo') || str_contains($lower, 'afaan')) {
            $filters['language'] = 'om';
            $filters['human_readable_summary'] = trim($filters['human_readable_summary'] . ' (Afaan Oromoo cohort)');
        } elseif (str_contains($lower, 'amharic') || str_contains($lower, 'አማርኛ')) {
            $filters['language'] = 'am';
            $filters['human_readable_summary'] = trim($filters['human_readable_summary'] . ' (Amharic cohort)');
        }

        if (str_contains($lower, 'female') || str_contains($lower, 'women')) {
            $filters['gender'] = 'Female';
        } elseif (str_contains($lower, 'male') || str_contains($lower, ' men')) {
            $filters['gender'] = 'Male';
        }

        $jobs = ['textile', 'garment', 'operator', 'construction', 'call centre', 'mechanic', 'cashier', 'welder', 'carpenter', 'driver', 'hawassa', 'adama', 'sewing', 'selam', 'abel', 'almaz', 'yordanos'];
        foreach ($jobs as $job) {
            if (str_contains($lower, $job)) {
                $filters['job_position_search'] = $job;
                $filters['human_readable_summary'] = trim($filters['human_readable_summary'] . " matching '{$job}'");
                break;
            }
        }

        if (empty($filters['human_readable_summary'])) {
            $filters['job_position_search'] = $query;
            $filters['human_readable_summary'] = "Showing records matching keyword \"{$query}\"";
        }

        return $filters;
    }

    public function exportEvidencePack(EvidencePackGenerator $generator)
    {
        return response()->json($generator->generate())
            ->header('Content-Disposition', 'attachment; filename="evidence-pack.json"');
    }
}
