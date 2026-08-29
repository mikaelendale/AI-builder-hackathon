<?php

namespace App\Http\Controllers;

use App\Models\HardCaseFlag;
use App\Models\Interview;
use App\Models\SheetRow;
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
}
