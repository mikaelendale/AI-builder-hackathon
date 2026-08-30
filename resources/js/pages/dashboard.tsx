import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Award,
    Building2,
    Calendar,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Copy,
    DollarSign,
    Download,
    ExternalLink,
    Eye,
    FileCheck2,
    FileSpreadsheet,
    Filter,
    HelpCircle,
    History,
    Info,
    Lock,
    Mic,
    Phone,
    Radio,
    RefreshCw,
    Search,
    Share2,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Terminal,
    UserCheck,
    Users,
    X,
    XCircle,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Checkpoint, ContinuityTimeline } from '@/components/continuity-timeline';
import { ThemeToggle } from '@/components/theme-toggle';
import { AgentTrace, type TraceEvent } from '@/components/agent-trace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MarkerHighlight, WavyUnderline } from '@/components/ui/editorial-annotations';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'sequa Ethiopia',
        href: '/',
    },
    {
        title: 'SICP Programme',
        href: '/dashboard',
    },
    {
        title: 'Records',
        href: '/dashboard',
    },
];

interface ClauseAssessment {
    id: number;
    clause_key: string;
    status: 'met' | 'not_met' | 'unclear';
    confidence: number;
    verifier_flag?: boolean | null;
    verifier_note?: string | null;
    evidence_quote: string | null;
    sdg_tags: string[] | null;
}

interface HardCaseFlag {
    id: number;
    type: string;
    detail: string;
    resolved_action?: string | null;
}

interface Beneficiary {
    id: number;
    name: string;
    persona_type: string;
    phone_type: string;
    language: string;
}

interface EmployerConfirmation {
    id: number;
    confirmation_token: string;
    status: 'pending' | 'confirmed' | 'disputed' | 'expired';
    employer_reported_hours_per_week: number | null;
    employer_reported_months_employed: number | null;
    employer_note: string | null;
    expires_at: string;
    responded_at?: string | null;
}

interface Interview {
    id: number;
    interview_round?: number;
    status: string;
    transcript_raw: string | null;
    consent_given: boolean;
    created_at: string;
    beneficiary: Beneficiary;
    clause_assessments?: ClauseAssessment[];
    clauseAssessments?: ClauseAssessment[];
    hard_case_flags?: HardCaseFlag[];
    hardCaseFlags?: HardCaseFlag[];
    employer_confirmation?: EmployerConfirmation | null;
    employerConfirmation?: EmployerConfirmation | null;
    continuity_checkpoints?: Checkpoint[];
    continuityCheckpoints?: Checkpoint[];
    trace_events?: TraceEvent[];
    traceEvents?: TraceEvent[];
}

interface SheetRow {
    id: number;
    interview_id: number;
    job_position: string;
    gender: string;
    age_band: string;
    monthly_salary_etb: number | null;
    is_good_job: boolean;
    employer_reported_value: number | null;
    worker_reported_value: number | null;
    discrepancy_flag: boolean;
    confirmation_source: 'worker_only' | 'employer_only' | 'both_agree' | 'both_disagree' | 'unconfirmed';
    confirmed_at: string | null;
    created_at: string;
    interview: Interview;
}

interface DashboardProps {
    rows: SheetRow[];
    summary: {
        companies: number;
        interviewed: number;
        discrepancies: number;
        hardCases: number;
        verifiedGoodJobs: number;
        employerClaimed: number;
    };
}

const CLAUSE_DEFINITIONS: Record<
    string,
    { key: string; short: string; label: string; sdg: string; description: string }
> = {
    age_15_plus: {
        key: 'age_15_plus',
        short: 'Age',
        label: 'Age ≥ 15 Threshold',
        sdg: 'SDG 8.6',
        description: 'Beneficiary is verified to be 15 years or older (statutory employment threshold).',
    },
    hours_threshold: {
        key: 'hours_threshold',
        short: 'Hours',
        label: '20h/wk (26wks) / 520h/yr',
        sdg: 'SDG 8.5',
        description: 'Sufficient work duration and intensity meeting 20 hours/week over 6 months or 520h/year.',
    },
    min_wage: {
        key: 'min_wage',
        short: 'Wage',
        label: 'Legal Minimum Wage',
        sdg: 'SDG 1.2',
        description: 'Payment meets or exceeds statutory baseline (1,500 ETB/month or equivalent cash).',
    },
    no_child_labor: {
        key: 'no_child_labor',
        short: 'Child',
        label: 'No Child Labour',
        sdg: 'SDG 8.7',
        description: 'Full compliance with ILO Convention 138 & 182 on minimum age and light work conditions.',
    },
    no_forced_labor: {
        key: 'no_forced_labor',
        short: 'Consent',
        label: 'No Coercion / Forced Labour',
        sdg: 'SDG 8.8',
        description: 'Free voluntary consent, no identity withholding, and freedom to leave the workplace.',
    },
    no_discrimination: {
        key: 'no_discrimination',
        short: 'Equality',
        label: 'Non-Discrimination & Equal Pay',
        sdg: 'SDG 5.5',
        description: 'Equal pay for equal work without gender, ethnic, or religious bias or harassment.',
    },
    freedom_of_association: {
        key: 'freedom_of_association',
        short: 'Union',
        label: 'Freedom of Association',
        sdg: 'SDG 8.8',
        description: 'Right of workers to organize, join workplace associations, and discuss grievances.',
    },
};

export default function Dashboard({ rows = [], summary }: DashboardProps) {
    const [filterMode, setFilterMode] = useState<'all' | 'discrepancies' | 'hard_cases' | 'good_jobs' | 'bilateral'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAuditRow, setSelectedAuditRow] = useState<SheetRow | null>(null);
    const [activeTab, setActiveTab] = useState<'clauses' | 'bilateral' | 'continuity' | 'transcript' | 'trace'>('clauses');
    const [copiedJson, setCopiedJson] = useState(false);
    const [isExportingEvidencePack, setIsExportingEvidencePack] = useState(false);

    // Feature 4: Natural-Language Dashboard Search ("Ask the Ledger")
    const [aiQueryInput, setAiQueryInput] = useState('');
    const [isQueryingAi, setIsQueryingAi] = useState(false);
    const [aiQuerySummary, setAiQuerySummary] = useState<string | null>(null);
    const [aiQueryRows, setAiQueryRows] = useState<SheetRow[] | null>(null);

    const csrfToken = () =>
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

    const handleExecuteAiQuery = async (queryText: string) => {
        if (!queryText.trim()) return;
        setIsQueryingAi(true);
        setAiQueryInput(queryText);

        try {
            const res = await fetch('/dashboard/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({ query: queryText }),
            });
            const data = await res.json();
            if (data.rows) {
                setAiQueryRows(data.rows);
                setAiQuerySummary(data.summary || `Found ${data.count} matching records`);
            }
        } catch (err) {
            console.error('[sequa-ledger-query] Error executing query:', err);
        } finally {
            setIsQueryingAi(false);
        }
    };

    const handleClearAiQuery = () => {
        setAiQueryRows(null);
        setAiQuerySummary(null);
        setAiQueryInput('');
    };

    // Active base rows (either AI-filtered or master cohort)
    const activeBaseRows = aiQueryRows ?? rows;

    // Filter computation
    const filteredRows = useMemo(() => {
        return activeBaseRows.filter((r) => {
            if (filterMode === 'discrepancies' && !r.discrepancy_flag) return false;
            if (filterMode === 'hard_cases' && (!r.interview?.hard_case_flags || r.interview.hard_case_flags.length === 0)) return false;
            if (filterMode === 'good_jobs' && !r.is_good_job) return false;
            if (filterMode === 'bilateral' && r.confirmation_source === 'unconfirmed') return false;

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const nameMatch = r.interview?.beneficiary?.name?.toLowerCase().includes(query);
                const posMatch = r.job_position?.toLowerCase().includes(query);
                const personaMatch = r.interview?.beneficiary?.persona_type?.toLowerCase().includes(query);
                const langMatch = r.interview?.beneficiary?.language?.toLowerCase().includes(query);
                return nameMatch || posMatch || personaMatch || langMatch;
            }

            return true;
        });
    }, [activeBaseRows, filterMode, searchQuery]);

    const selectedRowIndex = useMemo(() => {
        if (!selectedAuditRow) return -1;
        return filteredRows.findIndex((r) => r.id === selectedAuditRow.id);
    }, [filteredRows, selectedAuditRow]);

    const handlePrevRow = () => {
        if (selectedRowIndex > 0) {
            setSelectedAuditRow(filteredRows[selectedRowIndex - 1]);
        }
    };

    const handleNextRow = () => {
        if (selectedRowIndex >= 0 && selectedRowIndex < filteredRows.length - 1) {
            setSelectedAuditRow(filteredRows[selectedRowIndex + 1]);
        }
    };

    const handleCopyDossierJson = () => {
        if (!selectedAuditRow) return;
        const jsonPayload = {
            record_id: selectedAuditRow.id,
            beneficiary_name: selectedAuditRow.interview?.beneficiary?.name,
            job_position: selectedAuditRow.job_position,
            gender: selectedAuditRow.gender,
            age_band: selectedAuditRow.age_band,
            monthly_salary_etb: selectedAuditRow.monthly_salary_etb,
            is_good_job: selectedAuditRow.is_good_job,
            discrepancy_flag: selectedAuditRow.discrepancy_flag,
            confirmation_source: selectedAuditRow.confirmation_source,
            statutory_clauses: selectedAuditRow.interview?.clauseAssessments?.map((c) => ({
                clause_key: c.clause_key,
                status: c.status,
                confidence: c.confidence,
                evidence_quote: c.evidence_quote,
            })),
            employer_confirmation: selectedAuditRow.interview?.employer_confirmation,
            continuity_checkpoints: selectedAuditRow.interview?.continuity_checkpoints,
        };
        navigator.clipboard.writeText(JSON.stringify(jsonPayload, null, 2));
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
    };

    // Aggregate statistics
    const stats = useMemo(() => {
        const total = rows.length;
        const goodJobs = rows.filter((r) => r.is_good_job).length;
        const discrepancies = rows.filter((r) => r.discrepancy_flag).length;
        const hardCases = rows.filter((r) => (r.interview?.hard_case_flags || []).length > 0).length;
        const bilateralReconciled = rows.filter((r) => r.confirmation_source !== 'unconfirmed').length;
        const bothAgree = rows.filter((r) => r.confirmation_source === 'both_agree').length;
        const bothDisagree = rows.filter((r) => r.confirmation_source === 'both_disagree').length;
        const employerOnly = rows.filter((r) => r.confirmation_source === 'employer_only').length;
        const workerOnly = rows.filter((r) => r.confirmation_source === 'worker_only').length;

        const goodJobRate = total > 0 ? Math.round((goodJobs / total) * 100) : 0;

        return {
            total,
            goodJobs,
            discrepancies,
            hardCases,
            bilateralReconciled,
            bothAgree,
            bothDisagree,
            employerOnly,
            workerOnly,
            goodJobRate,
        };
    }, [rows]);

    const handleDownloadEvidencePack = () => {
        setIsExportingEvidencePack(true);
        setTimeout(() => {
            setIsExportingEvidencePack(false);
            window.location.href = '/dashboard/evidence-pack';
        }, 650);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Job Check Dashboard" />

            <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
                {/* Executive Header Block with Actions */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-border pb-6">
                    <div>
                        <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                            <span className="size-2 rounded-full bg-emerald-600 dark:text-emerald-400" />
                            <span>German Development Cooperation • sequa gGmbH</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-serif font-normal tracking-tight text-foreground">
                            Worker Job Check Report
                        </h1>
                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                            Comparing employer reports with worker interviews across 7 job checks.
                        </p>
                    </div>

                    {/* Actions & Officer Info */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 self-start lg:self-end">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadEvidencePack}
                                disabled={isExportingEvidencePack}
                                className="h-8 px-3 text-xs shadow-xs gap-1.5 font-medium"
                            >
                                {isExportingEvidencePack ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                                        <span>Creating Proof File...</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="hidden sm:inline">Download</span> Proof File (.json)
                                    </>
                                )}
                            </Button>

                            <Link href="/demo/feature-phone">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 text-xs shadow-xs gap-1.5 font-medium"
                                >
                                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="hidden sm:inline">Feature-Phone</span> IVR
                                </Button>
                            </Link>

                            <Link href="/interview">
                                <Button
                                    size="sm"
                                    className="h-8 px-3.5 text-xs font-medium shadow-xs gap-1.5"
                                >
                                    <Mic className="w-3.5 h-3.5" />
                                    <span>Start Voice Check</span>
                                </Button>
                            </Link>
                        </div>

                        <div className="flex items-center gap-2.5 p-2 rounded-xl border border-border bg-card shadow-xs">
                            <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                                HW
                            </div>
                            <div className="text-left text-xs pr-1">
                                <div className="font-semibold text-foreground leading-tight">Hiwot W.</div>
                                <div className="text-[10px] text-muted-foreground font-mono">M&E Officer</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feature 4: Natural-Language Dashboard Search ("Ask the Ledger") */}
                <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-4 sm:p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                <Sparkles className="size-3.5" />
                            </div>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                    Search Records
                                </span>
                                <span className="ml-2 text-[10px] font-mono text-muted-foreground hidden sm:inline">
                                    Search using everyday words
                                </span>
                            </div>
                        </div>
                        {aiQueryRows !== null && (
                            <button
                                type="button"
                                onClick={handleClearAiQuery}
                                className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 hover:underline"
                            >
                                <X className="size-3" /> Clear AI Filter
                            </button>
                        )}
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleExecuteAiQuery(aiQueryInput);
                        }}
                        className="flex items-center gap-2"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={aiQueryInput}
                                onChange={(e) => setAiQueryInput(e.target.value)}
                                placeholder="Ask anything (e.g. 'show mismatched cases', 'under-15 stopped', 'Afaan Oromoo textile operators', '100% passed good jobs')..."
                                className="w-full h-10 pl-10 pr-4 rounded-xl text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isQueryingAi || !aiQueryInput.trim()}
                            className="h-10 px-4 text-xs font-semibold rounded-xl bg-primary text-primary-foreground flex items-center gap-1.5 shadow-xs shrink-0"
                        >
                            {isQueryingAi ? (
                                <>
                                    <RefreshCw className="size-3.5 animate-spin" />
                                    <span>Searching...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="size-3.5" />
                                    <span>Query</span>
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Suggestion Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground mr-1">Suggestions:</span>
                        {[
                            'Show mismatched cases',
                            'Under-15 stopped',
                            'Afaan Oromoo textile operators',
                            '100% passed good jobs',
                            'Both sides agree',
                        ].map((suggestion) => (
                            <button
                                key={suggestion}
                                type="button"
                                onClick={() => handleExecuteAiQuery(suggestion)}
                                className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors"
                            >
                                ✨ {suggestion}
                            </button>
                        ))}
                    </div>

                    {/* Conversational Query Confirmation Banner */}
                    {aiQuerySummary && (
                        <div className="mt-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs text-foreground">
                            <div className="flex items-center gap-2">
                                <Sparkles className="size-4 text-primary shrink-0" />
                                <span className="font-medium">{aiQuerySummary}</span>
                                <span className="text-[10px] font-mono text-muted-foreground">({filteredRows.length} matching rows)</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleClearAiQuery}
                                className="text-[11px] font-semibold text-primary hover:underline ml-3 shrink-0"
                            >
                                Show All Workers
                            </button>
                        </div>
                    )}
                </div>

                {/* Strategic Metric Cards (4 Cards Grid - Bold Executive KPI Strip) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                        {/* 1. Total Beneficiaries Audited */}
                        <div
                            onClick={() => setFilterMode('all')}
                            className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 border ${
                                filterMode === 'all'
                                    ? 'bg-card border-foreground/40 ring-2 ring-foreground/20'
                                    : 'bg-card/80 border-border/80 hover:border-border'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <span className="relative flex size-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                                        </span>
                                        <span>Workers Checked</span>
                                    </div>
                                    <Users className="w-4 h-4 text-muted-foreground/80" />
                                </div>
                                <div className="mt-4 flex items-baseline gap-2.5">
                                    <span className="text-4xl sm:text-5xl font-serif font-medium tracking-tight text-foreground">
                                        {stats.total}
                                    </span>
                                    <span className="text-xs sm:text-sm font-mono text-muted-foreground">/ 23 Workers</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                    All workers have been checked by voice interview.
                                </p>
                            </div>
                            <div className="mt-5 pt-3.5 border-t border-border/50 flex items-center justify-between text-[11px]">
                                <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> ✅ All Checked
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    {filterMode === 'all' ? '● Active Filter' : 'Click to show all'}
                                </span>
                            </div>
                        </div>

                        {/* 2. Verified Good Jobs */}
                        <div
                            onClick={() => setFilterMode('good_jobs')}
                            className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 border ${
                                filterMode === 'good_jobs'
                                    ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30'
                                    : 'bg-emerald-500/[0.03] border-emerald-500/30 hover:border-emerald-500/60'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                    <span>Confirmed Good Jobs</span>
                                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="mt-4 flex items-baseline gap-2.5">
                                    <span className="text-4xl sm:text-5xl font-serif font-medium tracking-tight text-emerald-700 dark:text-emerald-300">
                                        {stats.goodJobs}
                                    </span>
                                    <span className="text-xs sm:text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                        ({stats.goodJobRate}%)
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                    Meets all 7 fair work rules.
                                </p>
                            </div>
                            <div className="mt-5 pt-3.5 border-t border-emerald-500/20 flex items-center justify-between text-[11px]">
                                <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                                    vs 23 claimed by employers
                                </span>
                                <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">
                                    {filterMode === 'good_jobs' ? '● Active Filter' : 'Click to filter'}
                                </span>
                            </div>
                        </div>

                        {/* 3. Bilateral Discrepancies */}
                        <div
                            onClick={() => setFilterMode('discrepancies')}
                            className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 border ${
                                filterMode === 'discrepancies'
                                    ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                                    : 'bg-amber-500/[0.03] border-amber-500/30 hover:border-amber-500/60'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                    <span>Mismatches Found</span>
                                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="mt-4 flex items-baseline gap-2.5">
                                    <span className="text-4xl sm:text-5xl font-serif font-medium tracking-tight text-amber-700 dark:text-amber-300">
                                        {stats.discrepancies}
                                    </span>
                                    <span className="text-xs sm:text-sm font-mono font-semibold text-amber-600 dark:text-amber-400">
                                        Mismatches
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                    Employer claimed "Good Job" but voice audit revealed statutory gaps.
                                </p>
                            </div>
                            <div className="mt-5 pt-3.5 border-t border-amber-500/20 flex items-center justify-between text-[11px]">
                                <span className="text-amber-700 dark:text-amber-300 font-medium">
                                    Claimed 1 / Audited 0
                                </span>
                                <span className="font-mono text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                                    {filterMode === 'discrepancies' ? '● Active Filter' : '⚠️ Payment Risk'}
                                </span>
                            </div>
                        </div>

                        {/* 4. Statutory Hard Stops */}
                        <div
                            onClick={() => setFilterMode('hard_cases')}
                            className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 border ${
                                filterMode === 'hard_cases'
                                    ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30'
                                    : 'bg-rose-500/[0.03] border-rose-500/30 hover:border-rose-500/60'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-rose-700 dark:text-rose-300">
                                    <span>Stopped Cases</span>
                                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                </div>
                                <div className="mt-4 flex items-baseline gap-2.5">
                                    <span className="text-4xl sm:text-5xl font-serif font-medium tracking-tight text-rose-700 dark:text-rose-300">
                                        {stats.hardCases}
                                    </span>
                                    <span className="text-xs sm:text-sm font-mono font-semibold text-rose-600 dark:text-rose-400">
                                        Halted
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                    Under-15 minors or coercion halted immediately by rule engine.
                                </p>
                            </div>
                            <div className="mt-5 pt-3.5 border-t border-rose-500/20 flex items-center justify-between text-[11px]">
                                <span className="text-rose-700 dark:text-rose-300 font-medium">
                                    Zero-tolerance exclusion
                                </span>
                                <span className="font-mono text-[10px] text-rose-700 dark:text-rose-300 font-semibold">
                                    {filterMode === 'hard_cases' ? '● Active Filter' : 'Click to filter'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bilateral Distribution & 7 Statutory Criteria Bar */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* Bilateral Reconciliation Source Breakdown (7 cols) */}
                        <div className="lg:col-span-7 p-5 rounded-2xl border border-border/70 bg-card/60 shadow-2xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                    <span>Bilateral Reconciliation Breakdown</span>
                                </div>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                    {stats.bilateralReconciled} Reconciled / {stats.total} Total
                                </span>
                            </div>

                            {/* Multi-segment distribution progress bar */}
                            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden flex">
                                <div
                                    style={{ width: `${(stats.bothAgree / stats.total) * 100}%` }}
                                    className="bg-emerald-500 h-full transition-all"
                                    title={`Both Agree: ${stats.bothAgree}`}
                                />
                                <div
                                    style={{ width: `${((stats.employerOnly + stats.workerOnly) / stats.total) * 100}%` }}
                                    className="bg-muted-foreground/30 h-full transition-all"
                                    title={`Single Source: ${stats.employerOnly + stats.workerOnly}`}
                                />
                                <div
                                    style={{ width: `${(stats.bothDisagree / stats.total) * 100}%` }}
                                    className="bg-destructive h-full transition-all"
                                    title={`Disputed: ${stats.bothDisagree}`}
                                />
                            </div>

                            {/* Legend Tags */}
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground font-mono">
                                <div className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-emerald-500" />
                                    <span>Both Agree ({stats.bothAgree})</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-muted-foreground/40" />
                                    <span>Single Source ({stats.employerOnly + stats.workerOnly})</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-destructive" />
                                    <span>Disputed / Contradiction ({stats.bothDisagree})</span>
                                </div>
                            </div>
                        </div>

                        {/* Signed Evidence Pack Proof (5 cols) */}
                        <div className="lg:col-span-5 p-5 rounded-2xl border border-border/70 bg-card/60 shadow-2xs flex flex-col justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                                    <div className="flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span>Tamper-Evident Evidence Pack</span>
                                    </div>
                                    <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-full border border-border/60">
                                        HMAC-SHA256
                                    </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Chained cryptographic SHA-256 hash tree over all 23 beneficiary audits, excluding PII while proving aggregate fidelity to donor inspectors.
                                </p>
                            </div>

                            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                                <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px]">
                                    Chain: 23 Nodes Linked
                                </span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleDownloadEvidencePack}
                                    className="h-7 text-xs text-foreground hover:bg-muted p-0 gap-1"
                                >
                                    <span>Download .json</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Enterprise Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-card/70 rounded-2xl border border-border/70 shadow-2xs">
                        {/* Pill Segment Controls */}
                        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border">
                            <Button
                                size="sm"
                                variant={filterMode === 'all' ? 'default' : 'ghost'}
                                onClick={() => setFilterMode('all')}
                                className="text-xs h-8 rounded-xl font-medium"
                            >
                                All ({stats.total})
                            </Button>
                            <Button
                                size="sm"
                                variant={filterMode === 'good_jobs' ? 'default' : 'ghost'}
                                onClick={() => setFilterMode('good_jobs')}
                                className="text-xs h-8 rounded-xl font-medium"
                            >
                                Verified Good Jobs ({stats.goodJobs})
                            </Button>
                            <Button
                                size="sm"
                                variant={filterMode === 'discrepancies' ? 'default' : 'ghost'}
                                onClick={() => setFilterMode('discrepancies')}
                                className="text-xs h-8 rounded-xl font-medium"
                            >
                                Discrepancies ({stats.discrepancies})
                            </Button>
                            <Button
                                size="sm"
                                variant={filterMode === 'bilateral' ? 'default' : 'ghost'}
                                onClick={() => setFilterMode('bilateral')}
                                className="text-xs h-8 rounded-xl font-medium"
                            >
                                Bilateral Reconciled ({stats.bilateralReconciled})
                            </Button>
                            <Button
                                size="sm"
                                variant={filterMode === 'hard_cases' ? 'default' : 'ghost'}
                                onClick={() => setFilterMode('hard_cases')}
                                className="text-xs h-8 rounded-xl font-medium"
                            >
                                Hard Stops ({stats.hardCases})
                            </Button>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-72 p-1">
                            <Search className="w-3.5 h-3.5 absolute left-3.5 top-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search worker, job, persona..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-background border border-border/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground text-xs"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Master Enterprise Ledger Table */}
                    <div className="border border-border/70 rounded-2xl overflow-hidden bg-card/60 shadow-2xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-muted/40 border-b border-border/70 text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
                                        <th className="py-3.5 px-4 font-medium">Beneficiary Profile</th>
                                        <th className="py-3.5 px-4 font-medium">Job Placement & Wage</th>
                                        <th className="py-3.5 px-4 font-medium">Audit Reconciliation</th>
                                        <th className="py-3.5 px-4 font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <span>7 Statutory Criteria</span>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-[9px] font-normal lowercase tracking-normal text-muted-foreground/80 cursor-help">
                                                            (ratio & dots)
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="p-2.5 text-xs bg-card border border-border text-foreground shadow-md z-50">
                                                        <div className="font-semibold mb-1">Clause Status Legend:</div>
                                                        <div className="flex flex-col gap-1 font-mono text-[10px]">
                                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                                                <span className="size-2 rounded-full bg-emerald-500" />
                                                                <span>Green: Met statutory requirement</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                                                <span className="size-2 rounded-full bg-amber-500" />
                                                                <span>Amber: Unclear / Ambiguous (Follow-up probe)</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-destructive">
                                                                <span className="size-2 rounded-full bg-destructive" />
                                                                <span>Red: Not Met / Violation</span>
                                                            </div>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </th>
                                        <th className="py-3.5 px-4 font-medium">Continuity & SDGs</th>
                                        <th className="py-3.5 px-4 font-medium text-right">Audit Dossier</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {filteredRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                                                No beneficiaries found matching current filter or search criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRows.map((row) => {
                                            const b = row.interview?.beneficiary;
                                            const assessments = row.interview?.clauseAssessments || [];
                                            const isDiscrepant = row.discrepancy_flag;
                                            const hardFlags = row.interview?.hard_case_flags || [];
                                            const hasHardCases = hardFlags.length > 0;
                                            const confSource = row.confirmation_source || 'unconfirmed';
                                            const checkpoints = row.interview?.continuity_checkpoints || [];

                                            return (
                                                <tr
                                                    key={row.id}
                                                    className={`transition-colors hover:bg-muted/30 ${
                                                        hasHardCases
                                                            ? 'border-l-2 border-l-rose-500 bg-rose-500/[0.02]'
                                                            : isDiscrepant
                                                              ? 'border-l-2 border-l-amber-500 bg-amber-500/[0.02]'
                                                              : 'border-l-2 border-l-transparent'
                                                    }`}
                                                >
                                                    {/* Beneficiary Profile */}
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="size-7 rounded-full bg-muted flex items-center justify-center font-bold text-[10px] text-foreground shrink-0 border border-border/60">
                                                                {b?.name?.charAt(0) || 'W'}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                                                    <span>{b?.name || `Worker #${row.id}`}</span>
                                                                    {b?.persona_type === 'selam' && (
                                                                        <span className="text-[9px] px-1.5 py-0 rounded-full font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                                                            Selam (EN)
                                                                        </span>
                                                                    )}
                                                                    {b?.persona_type === 'abel' && (
                                                                        <span className="text-[9px] px-1.5 py-0 rounded-full font-mono bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                                                            Abel (AM)
                                                                        </span>
                                                                    )}
                                                                    {b?.persona_type === 'almaz' && (
                                                                        <span className="text-[9px] px-1.5 py-0 rounded-full font-mono bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                                                                            Almaz (OM)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5 font-mono">
                                                                    <span>{row.gender}</span>
                                                                    <span>•</span>
                                                                    <span>{row.age_band}</span>
                                                                    <span>•</span>
                                                                    <span>{b?.phone_type === 'feature_phone' ? '2G IVR' : 'Smartphone'}</span>
                                                                    <span>•</span>
                                                                    <span className="uppercase text-[9px] font-bold text-muted-foreground/80">{b?.language || 'en'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Job Placement & Wage */}
                                                    <td className="py-3.5 px-4">
                                                        <div className="font-medium text-foreground text-xs">
                                                            {row.job_position}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono flex items-center gap-1.5">
                                                            <span>{row.monthly_salary_etb ? `${row.monthly_salary_etb.toLocaleString()} ETB/mo` : 'Cash / Piece Rate'}</span>
                                                            <span className="text-muted-foreground/40">•</span>
                                                            <span className="opacity-70">Employer Claim: 1</span>
                                                        </div>
                                                    </td>

                                                    {/* Audit Reconciliation Verdict + Source */}
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div>
                                                                {row.is_good_job ? (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 cursor-help">
                                                                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                                                                Verified Good Job (1)
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="text-xs p-2 max-w-xs">
                                                                            Confirmed by independent worker audit across all 7 statutory criteria (Claimed 1 / Audited 1).
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                ) : isDiscrepant ? (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 cursor-help">
                                                                                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                                                                Discrepancy (0)
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="text-xs p-2 max-w-xs">
                                                                            Worker and employer don't agree — flagged for review and clawback (Claimed 1 / Audited 0).
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                ) : (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive px-2 py-0.5 rounded-md bg-destructive/10 border border-destructive/20 cursor-help">
                                                                                <XCircle className="w-3 h-3 text-destructive" />
                                                                                Hard Stop (0)
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="text-xs p-2 max-w-xs">
                                                                            Statutory safety interlock triggered — interview terminated early (Under-15 Minor).
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                                                {confSource === 'both_agree' && (
                                                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                                        ✓ Bilateral Confirmed (Both Agree)
                                                                    </span>
                                                                )}
                                                                {confSource === 'both_disagree' && (
                                                                    <span className="text-destructive font-semibold">
                                                                        ⚠ Disputed by Employer
                                                                    </span>
                                                                )}
                                                                {confSource === 'worker_only' && (
                                                                    <span className="text-muted-foreground">
                                                                        Worker Direct Audio Audit
                                                                    </span>
                                                                )}
                                                                {confSource === 'employer_only' && (
                                                                    <span className="text-muted-foreground">
                                                                        Employer Unverified Claim
                                                                    </span>
                                                                )}
                                                                {confSource === 'unconfirmed' && (
                                                                    <span className="text-muted-foreground/70">
                                                                        Pending Verification
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* 7 Statutory Criteria Column */}
                                                    <td className="py-3.5 px-4">
                                                        {(() => {
                                                            const metCount = assessments.filter((a) => a.status === 'met').length;
                                                            const unclearCount = assessments.filter((a) => a.status === 'unclear').length;
                                                            const notMetCount = assessments.filter((a) => a.status === 'not_met').length;
                                                            const totalCount = Object.keys(CLAUSE_DEFINITIONS).length;

                                                            return (
                                                                <div className="flex flex-col gap-1.5 min-w-[130px]">
                                                                    <div className="flex items-center justify-between">
                                                                        <span
                                                                            className={`text-[11px] font-mono font-bold ${
                                                                                metCount === totalCount
                                                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                                                    : notMetCount > 0
                                                                                      ? 'text-destructive'
                                                                                      : 'text-amber-600 dark:text-amber-400'
                                                                            }`}
                                                                        >
                                                                            {metCount}/{totalCount} Met
                                                                        </span>
                                                                        {notMetCount > 0 ? (
                                                                            <span className="text-[9px] font-mono font-semibold text-destructive px-1.5 py-0.2 rounded bg-destructive/10">
                                                                                {notMetCount} Violated
                                                                            </span>
                                                                        ) : unclearCount > 0 ? (
                                                                            <span className="text-[9px] font-mono font-semibold text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded bg-amber-500/10">
                                                                                {unclearCount} Unclear
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-500/10">
                                                                                100%
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Color-coded status dots */}
                                                                    <div className="flex items-center gap-1.5">
                                                                        {Object.values(CLAUSE_DEFINITIONS).map((clause) => {
                                                                            const ca = assessments.find((a) => a.clause_key === clause.key);
                                                                            const status = ca?.status || 'unclear';
                                                                            const confPct = Math.round((ca?.confidence || 0) * 100);

                                                                            return (
                                                                                <Tooltip key={clause.key}>
                                                                                    <TooltipTrigger asChild>
                                                                                        <button
                                                                                            type="button"
                                                                                            className={`size-2.5 rounded-full transition-transform hover:scale-150 cursor-pointer ${
                                                                                                status === 'met'
                                                                                                    ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                                                                                                    : status === 'not_met'
                                                                                                      ? 'bg-destructive ring-2 ring-destructive/20'
                                                                                                      : 'bg-amber-500 ring-2 ring-amber-500/20'
                                                                                            }`}
                                                                                            aria-label={`${clause.label}: ${status}`}
                                                                                        />
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent className="max-w-xs p-2.5 text-xs bg-card border border-border text-foreground shadow-md z-50">
                                                                                        <div className="font-semibold text-foreground flex items-center justify-between gap-2">
                                                                                            <span>{clause.label}</span>
                                                                                            <span
                                                                                                className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded ${
                                                                                                    status === 'met'
                                                                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                                                                        : status === 'not_met'
                                                                                                          ? 'bg-destructive/10 text-destructive'
                                                                                                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                                                                }`}
                                                                                            >
                                                                                                {status}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="text-[10px] text-muted-foreground mt-1">{clause.sdg} • {clause.description}</div>
                                                                                        <div className="mt-1.5 pt-1.5 border-t border-border/50 flex items-center justify-between text-[10px] font-mono">
                                                                                            <span>Confidence: {confPct}%</span>
                                                                                            {ca?.verifier_flag !== undefined && (
                                                                                                <span className={ca.verifier_flag === false ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                                                                                    {ca.verifier_flag === false ? '✓ Critic Verified' : '⚠ Critic Flagged'}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        {ca?.evidence_quote && (
                                                                                            <div className="mt-1.5 text-[10px] text-muted-foreground italic bg-muted/60 p-1.5 rounded-md border border-border/40">
                                                                                                "{ca.evidence_quote}"
                                                                                            </div>
                                                                                        )}
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>

                                                    {/* Continuity & SDGs */}
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex flex-col gap-1">
                                                            {checkpoints.length > 0 ? (
                                                                <span className="text-[9px] font-mono text-muted-foreground">
                                                                    {checkpoints.length} Checkpoints • {Math.max(...checkpoints.map((c) => c.cumulative_weeks_employed || 0))}wks
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] font-mono text-muted-foreground">
                                                                    Baseline Round 1
                                                                </span>
                                                            )}
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border/60">8.5</span>
                                                                <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border/60">8.6</span>
                                                                <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border/60">5.5</span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Audit Dossier Trigger */}
                                                    <td className="py-3.5 px-4 text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setSelectedAuditRow(row)}
                                                            className="h-7 text-[11px] px-2.5 rounded-lg border-border/80 text-foreground hover:bg-muted font-medium shadow-2xs"
                                                        >
                                                            <span>Inspect</span>
                                                            <ChevronRight className="w-3 h-3 ml-1 text-muted-foreground" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Audit Dossier Slide-out Sheet Drawer */}
                <Sheet open={!!selectedAuditRow} onOpenChange={(open) => !open && setSelectedAuditRow(null)}>
                    <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl bg-card border-border p-0 flex flex-col h-full shadow-2xl">
                        {selectedAuditRow && (
                            <>
                                {/* Drawer Header with Controls & Pagination */}
                                <div className="p-5 border-b border-border/70 bg-muted/20 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono uppercase tracking-wider bg-background px-2 py-0.5 rounded border border-border/60 text-muted-foreground">
                                                RECORD #{selectedAuditRow.id}
                                            </span>
                                            <span className="text-[11px] font-mono text-muted-foreground">
                                                ({selectedRowIndex + 1} of {filteredRows.length})
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 mr-6">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={selectedRowIndex <= 0}
                                                onClick={handlePrevRow}
                                                className="h-7 px-2 text-xs gap-1 border-border/70"
                                                title="Previous Beneficiary"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">Prev</span>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={selectedRowIndex >= filteredRows.length - 1}
                                                onClick={handleNextRow}
                                                className="h-7 px-2 text-xs gap-1 border-border/70"
                                                title="Next Beneficiary"
                                            >
                                                <span className="hidden sm:inline">Next</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Main Title Info */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <SheetTitle className="text-2xl font-serif font-normal text-foreground">
                                                {selectedAuditRow.interview?.beneficiary?.name || `Worker #${selectedAuditRow.id}`}
                                            </SheetTitle>
                                            <SheetDescription className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                                                <span>{selectedAuditRow.job_position}</span>
                                                <span>•</span>
                                                <span>{selectedAuditRow.gender}, {selectedAuditRow.age_band}</span>
                                                <span>•</span>
                                                <span>{selectedAuditRow.monthly_salary_etb ? `${selectedAuditRow.monthly_salary_etb.toLocaleString()} ETB/mo` : 'Cash / Piece Rate'}</span>
                                            </SheetDescription>
                                        </div>

                                        <div className="shrink-0">
                                            {selectedAuditRow.is_good_job ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold">
                                                    Verified Good Job (1)
                                                </Badge>
                                            ) : selectedAuditRow.discrepancy_flag ? (
                                                <Badge className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-xs font-semibold">
                                                    Discrepancy (0)
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-xs font-semibold">
                                                    Hard Stop (0)
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Utility Actions */}
                                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCopyDossierJson}
                                            className="h-7 text-xs border-border/70 gap-1.5 shadow-2xs"
                                        >
                                            {copiedJson ? (
                                                <>
                                                    <Check className="w-3 h-3 text-emerald-500" />
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied JSON!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3 h-3 text-muted-foreground" />
                                                    <span>Copy JSON Dossier</span>
                                                </>
                                            )}
                                        </Button>

                                        <Link href="/interview">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs border-border/70 gap-1.5 shadow-2xs"
                                            >
                                                <Mic className="w-3 h-3 text-muted-foreground" />
                                                <span>Live Audit Mode</span>
                                            </Button>
                                        </Link>

                                        <Link href="/demo/feature-phone">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs border-border/70 gap-1.5 shadow-2xs"
                                            >
                                                <Phone className="w-3 h-3 text-muted-foreground" />
                                                <span>IVR Simulator</span>
                                            </Button>
                                        </Link>
                                    </div>

                                    {/* Navigation Sub-Tabs */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('clauses')}
                                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                                                activeTab === 'clauses'
                                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                                            }`}
                                        >
                                            7 Statutory Criteria
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('bilateral')}
                                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                                                activeTab === 'bilateral'
                                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                                            }`}
                                        >
                                            Bilateral Match
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('continuity')}
                                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                                                activeTab === 'continuity'
                                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                                            }`}
                                        >
                                            Continuity ({selectedAuditRow.interview?.continuity_checkpoints?.length || 0})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('transcript')}
                                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                                                activeTab === 'transcript'
                                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                                            }`}
                                        >
                                            Transcript & Signal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('trace')}
                                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                                                activeTab === 'trace'
                                                    ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                                            }`}
                                        >
                                            <Terminal className="size-3" />
                                            <span>Agent Trace</span>
                                            <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-mono border-border/60">
                                                {selectedAuditRow.interview?.trace_events?.length || selectedAuditRow.interview?.traceEvents?.length || 0}
                                            </Badge>
                                        </button>
                                    </div>
                                </div>

                                {/* Drawer Scrollable Content Area */}
                                <div className="p-5 flex-1 overflow-y-auto space-y-4">
                                    {/* Hard Stop Safety Interlock Banner */}
                                    {(() => {
                                        const hardFlags = selectedAuditRow.interview?.hard_case_flags || selectedAuditRow.interview?.hardCaseFlags || [];
                                        const isHardStop = hardFlags.length > 0 || selectedAuditRow.interview?.status === 'stopped_hard_case';

                                        if (!isHardStop) return null;

                                        const isUnder15 = hardFlags.some((f) => f.type === 'under_15') || selectedAuditRow.age_band === 'Under 15';

                                        return (
                                            <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive flex flex-col gap-2 shadow-xs">
                                                <div className="flex items-center gap-2 font-bold text-sm text-destructive">
                                                    <span className="text-base">⛔</span>
                                                    <span>
                                                        {isUnder15
                                                            ? 'Interview Halted — Under-15 Hard Stop Triggered'
                                                            : 'Interview Halted — Statutory Hard Stop Safety Interlock'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-destructive/90 leading-relaxed font-medium">
                                                    {hardFlags[0]?.detail ||
                                                        'Beneficiary stated age under the statutory minimum threshold of 15. The interview was terminated immediately by the rule engine safety interlock.'}
                                                </p>
                                                <div className="text-[11px] text-destructive/90 font-medium pt-1.5 border-t border-destructive/20 flex items-center justify-between">
                                                    <span>Clauses below were intentionally not evaluated.</span>
                                                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive/20">
                                                        Zero-Tolerance Exclusion
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Tab 1: 7 Statutory Criteria */}
                                    {activeTab === 'clauses' && (
                                        <div className="space-y-3">
                                            {(() => {
                                                const hardFlags = selectedAuditRow.interview?.hard_case_flags || selectedAuditRow.interview?.hardCaseFlags || [];
                                                const isHardStop = hardFlags.length > 0 || selectedAuditRow.interview?.status === 'stopped_hard_case';

                                                return Object.values(CLAUSE_DEFINITIONS).map((clause) => {
                                                    const ca = selectedAuditRow.interview?.clauseAssessments?.find(
                                                        (a) => a.clause_key === clause.key
                                                    );
                                                    const isHaltedClause = isHardStop && clause.key !== 'age_15_plus';
                                                    const status = isHaltedClause ? 'halted' : (ca?.status || 'unclear');
                                                    const confPct = isHaltedClause ? 0 : Math.round((ca?.confidence || 0) * 100);

                                                    return (
                                                        <div
                                                            key={clause.key}
                                                            className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-colors ${
                                                                isHaltedClause
                                                                    ? 'border-border/40 bg-muted/10 opacity-75'
                                                                    : 'border-border/70 bg-muted/20'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        className={`size-2.5 rounded-full ${
                                                                            isHaltedClause
                                                                                ? 'bg-muted-foreground/40'
                                                                                : status === 'met'
                                                                                  ? 'bg-emerald-500'
                                                                                  : status === 'not_met'
                                                                                    ? 'bg-destructive'
                                                                                    : 'bg-amber-500'
                                                                        }`}
                                                                    />
                                                                    <span className={`font-semibold text-xs ${isHaltedClause ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                                        {clause.label}
                                                                    </span>
                                                                    <span className="text-[10px] font-mono text-muted-foreground">
                                                                        {clause.sdg}
                                                                    </span>
                                                                </div>

                                                                <span
                                                                    className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md ${
                                                                        isHaltedClause
                                                                            ? 'bg-muted text-muted-foreground border border-border/60'
                                                                            : status === 'met'
                                                                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                                              : status === 'not_met'
                                                                                ? 'bg-destructive/10 text-destructive'
                                                                                : 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
                                                                    }`}
                                                                >
                                                                    {isHaltedClause ? 'Halted / Not Evaluated' : `${status} (${confPct}%)`}
                                                                </span>
                                                            </div>

                                                            <p className="text-[11px] text-muted-foreground">
                                                                {isHaltedClause
                                                                    ? 'Evaluation safely aborted at inception following minor age detection.'
                                                                    : clause.description}
                                                            </p>

                                                            {!isHaltedClause && ca?.evidence_quote && (
                                                                <div className="mt-1 p-2 rounded-lg bg-background border border-border/60 text-[11px] italic text-foreground/90">
                                                                    "{ca.evidence_quote}"
                                                                </div>
                                                            )}

                                                            {!isHaltedClause && ca && ca.verifier_flag !== undefined && ca.verifier_flag !== null && (
                                                                <div className="flex items-center gap-1.5 text-[10px] font-mono pt-1">
                                                                    {ca.verifier_flag === false ? (
                                                                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                                                            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                                                            <span>Verifier-Critic Confirmed</span>
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                                            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                                                            <span>Flagged by Critic: {ca.verifier_note || 'Unfaithful quote'}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}

                                    {/* Tab 2: Bilateral Match */}
                                    {activeTab === 'bilateral' && (
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3">
                                                <div className="text-xs font-semibold text-foreground">
                                                    Bilateral Source Reconciliation: <span className="font-mono text-emerald-600 dark:text-emerald-400">{selectedAuditRow.confirmation_source}</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                    <div className="p-3 rounded-lg bg-background border border-border/60">
                                                        <div className="text-[10px] text-muted-foreground font-mono">Employer Self-Report</div>
                                                        <div className="font-semibold text-foreground mt-1">Good Job (1)</div>
                                                        <div className="text-[10px] text-muted-foreground mt-0.5">Submitted via 6-month Placement Sheet</div>
                                                    </div>
                                                    <div className="p-3 rounded-lg bg-background border border-border/60">
                                                        <div className="text-[10px] text-muted-foreground font-mono">Direct Worker Voice Audit</div>
                                                        <div className="font-semibold text-foreground mt-1">
                                                            {selectedAuditRow.is_good_job ? 'Verified (1)' : 'Discrepancy (0)'}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground mt-0.5">Voice Interview via Addis AI / OpenAI</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedAuditRow.interview?.employer_confirmation && (
                                                <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2 text-xs">
                                                    <div className="font-semibold text-foreground">Partner Enterprise Portal Response</div>
                                                    <div className="text-[11px] text-muted-foreground font-mono">
                                                        Token: {selectedAuditRow.interview.employer_confirmation.confirmation_token} • Status: {selectedAuditRow.interview.employer_confirmation.status}
                                                    </div>
                                                    <div className="text-xs text-foreground">
                                                        Reported Hours: {selectedAuditRow.interview.employer_confirmation.employer_reported_hours_per_week || 'N/A'} hrs/wk • Duration: {selectedAuditRow.interview.employer_confirmation.employer_reported_months_employed || 'N/A'} months
                                                    </div>
                                                    {selectedAuditRow.interview.employer_confirmation.employer_note && (
                                                        <div className="text-[11px] italic text-muted-foreground bg-muted p-2 rounded-md">
                                                            "{selectedAuditRow.interview.employer_confirmation.employer_note}"
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Tab 3: Continuity */}
                                    {activeTab === 'continuity' && (
                                        <div>
                                            <ContinuityTimeline checkpoints={selectedAuditRow.interview?.continuity_checkpoints || []} />
                                        </div>
                                    )}

                                    {/* Tab 4: Raw Transcript */}
                                    {activeTab === 'transcript' && (
                                        <div className="space-y-3">
                                            <div className="p-4 rounded-xl border border-border/70 bg-muted/20">
                                                <div className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Mic className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span>Full Raw Voice Transcript</span>
                                                    </div>
                                                    <span className="text-[10px] font-mono text-muted-foreground">
                                                        {selectedAuditRow.interview?.beneficiary?.language?.toUpperCase()} Channel
                                                    </span>
                                                </div>
                                                <div className="p-3 rounded-lg bg-background border border-border/60 text-xs font-mono whitespace-pre-wrap leading-relaxed text-foreground/90 max-h-80 overflow-y-auto">
                                                    {selectedAuditRow.interview?.transcript_raw || 'No raw transcript recorded.'}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab 5: Agent Observability Trace */}
                                    {activeTab === 'trace' && (
                                        <div className="space-y-3">
                                            <AgentTrace
                                                interviewId={selectedAuditRow.interview?.id}
                                                initialEvents={selectedAuditRow.interview?.trace_events || selectedAuditRow.interview?.traceEvents || []}
                                                isLiveStreaming={false}
                                                className="min-h-[440px]"
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </SheetContent>
                </Sheet>

                {/* Minimalist Editorial Footer */}
                <footer className="border-t border-border bg-card/40 py-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                        <div className="font-mono text-[11px]">
                            sequa gGmbH • Sustainable Industrial Clusters Programme (SICP)
                        </div>
                        <div className="flex items-center gap-5 text-[11px]">
                            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
                            <Link href="/interview" className="hover:text-foreground transition-colors">Voice Audit</Link>
                            <Link href="/demo/feature-phone" className="hover:text-foreground transition-colors">IVR Simulator</Link>
                            <a href="/dashboard/evidence-pack" className="hover:text-foreground transition-colors">Evidence Pack (.json)</a>
                        </div>
                    </div>
                </footer>
        </AppLayout>
    );
}
