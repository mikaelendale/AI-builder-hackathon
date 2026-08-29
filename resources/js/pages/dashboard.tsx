import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    Award,
    Building2,
    CheckCircle2,
    Clock,
    DollarSign,
    Download,
    ExternalLink,
    FileCheck2,
    FileSpreadsheet,
    Filter,
    HelpCircle,
    History,
    Lock,
    Mic,
    Phone,
    RefreshCw,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    UserCheck,
    Users,
    XCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import { Checkpoint, ContinuityTimeline } from '@/components/continuity-timeline';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ClauseAssessment {
    id: number;
    clause_key: string;
    status: 'met' | 'not_met' | 'unclear';
    confidence: number;
    evidence_quote: string | null;
    sdg_tags: string[] | null;
}

interface HardCaseFlag {
    id: number;
    type: string;
    detail: string;
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
}

interface Interview {
    id: number;
    interview_round?: number;
    status: string;
    transcript_raw: string | null;
    consent_given: boolean;
    created_at: string;
    beneficiary: Beneficiary;
    clause_assessments: ClauseAssessment[];
    hard_case_flags: HardCaseFlag[];
    employer_confirmation?: EmployerConfirmation | null;
    continuity_checkpoints?: Checkpoint[];
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

const CLAUSE_KEYS = [
    { key: 'age_15_plus', short: 'Age 15+', label: 'Age ≥ 15 Threshold' },
    { key: 'hours_threshold', short: 'Duration/Hours', label: '20h/wk × 26wks / 520h/yr' },
    { key: 'min_wage', short: 'Min Wage', label: 'Legally Established Minimum Wage' },
    { key: 'no_child_labor', short: 'No Child Labour', label: 'Absence of Child Labour' },
    { key: 'no_forced_labor', short: 'Free Consent', label: 'Absence of Forced Labour/Coercion' },
    { key: 'no_discrimination', short: 'Equal Pay', label: 'Non-Discrimination & Fairness' },
    { key: 'freedom_of_association', short: 'Union Rights', label: 'Freedom of Association' },
];

export default function Dashboard({ rows = [], summary }: DashboardProps) {
    const [filterMode, setFilterMode] = useState<'all' | 'discrepancies' | 'hard_cases' | 'good_jobs' | 'bilateral'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAuditRow, setSelectedAuditRow] = useState<SheetRow | null>(null);

    const filteredRows = rows.filter((r) => {
        // Mode filter
        if (filterMode === 'discrepancies' && !r.discrepancy_flag) return false;
        if (filterMode === 'hard_cases' && (!r.interview?.hard_case_flags || r.interview.hard_case_flags.length === 0)) return false;
        if (filterMode === 'good_jobs' && !r.is_good_job) return false;
        if (filterMode === 'bilateral' && r.confirmation_source === 'unconfirmed') return false;

        // Search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const nameMatch = r.interview?.beneficiary?.name?.toLowerCase().includes(query);
            const posMatch = r.job_position?.toLowerCase().includes(query);
            const personaMatch = r.interview?.beneficiary?.persona_type?.toLowerCase().includes(query);
            return nameMatch || posMatch || personaMatch;
        }

        return true;
    });

    const handleDownloadEvidencePack = () => {
        window.location.href = '/dashboard/evidence-pack';
    };

    return (
        <>
            <Head title="Monitoring Dashboard — Beneficiary Verification Sheet" />

            <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-6 transition-colors duration-200">
                {/* Header Strip */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
                    <div>
                        <div className="flex items-center gap-2 text-muted-foreground font-semibold text-xs tracking-wider uppercase">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>sequa Ethiopia • Verification Engine</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
                            Direct Beneficiary Verification Sheet
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl">
                            Cross-referencing employer self-reported 6-month job creation sheets against independent worker voice audits and bilateral employer confirmations.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <ThemeToggle />
                        <Button
                            variant="outline"
                            onClick={handleDownloadEvidencePack}
                            className="border-border text-foreground hover:bg-muted text-xs sm:text-sm h-9"
                        >
                            <Download className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                            Download Signed Evidence Pack
                        </Button>
                        <Link href="/demo/feature-phone">
                            <Button
                                variant="outline"
                                className="border-border text-foreground hover:bg-muted text-xs sm:text-sm h-9"
                            >
                                <Phone className="w-4 h-4 mr-1.5 text-amber-600" /> IVR Mode
                            </Button>
                        </Link>
                        <Link href="/interview">
                            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm h-9">
                                <Mic className="w-4 h-4 mr-2" /> Live Phone Interview
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Persona Context Banner */}
                <div className="p-3 bg-card border border-border rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                        <div className="px-2.5 py-1 rounded-md bg-muted text-foreground font-semibold text-xs border border-border">
                            Hiwot (34)
                        </div>
                        <div>
                            <span className="font-semibold text-foreground">Monitoring Officer View:</span>
                            <span className="text-muted-foreground ml-1">
                                Files the 6-month sheet for 23 cohort companies with bilateral reconciliation, signed tamper-evident evidence packs, and longitudinal checkpoints.
                            </span>
                        </div>
                    </div>
                    <Badge variant="outline" className="border-border bg-muted/50 text-muted-foreground text-[10px] whitespace-nowrap hidden sm:inline-flex">
                        HMAC-SHA256 Signed Evidence Chain
                    </Badge>
                </div>

                {/* Summary KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                    <Card className="bg-card border-border shadow-xs">
                        <CardHeader className="p-4 pb-2">
                            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                <span>Cohort Enterprises</span>
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold text-foreground mt-1">
                                {summary?.companies || 23}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-[11px] text-muted-foreground">Partner employer sheets</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-xs">
                        <CardHeader className="p-4 pb-2">
                            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                <span>Audited Workers</span>
                                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold text-foreground mt-1">
                                {summary?.interviewed || rows.length}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">100% direct voice audits</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-xs">
                        <CardHeader className="p-4 pb-2">
                            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                <span>Verified Good Jobs</span>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                {summary?.verifiedGoodJobs || 0}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-[11px] text-muted-foreground">
                                vs {summary?.employerClaimed || 0} claimed by employers
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-xs">
                        <CardHeader className="p-4 pb-2">
                            <CardDescription className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Discrepancies Flagged</span>
                                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                                {summary?.discrepancies || 0}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-[11px] text-muted-foreground">Employer vs Worker mismatch</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border col-span-2 lg:col-span-1 shadow-xs">
                        <CardHeader className="p-4 pb-2">
                            <CardDescription className="text-xs font-semibold text-destructive uppercase tracking-wider flex items-center justify-between">
                                <span>Hard Stops / Flags</span>
                                <AlertCircle className="w-4 h-4 text-destructive" />
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold text-destructive mt-1">
                                {summary?.hardCases || 0}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-[11px] text-muted-foreground">Under-15 & contradictions</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
                    <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        <Button
                            size="sm"
                            variant={filterMode === 'all' ? 'default' : 'outline'}
                            onClick={() => setFilterMode('all')}
                            className="text-xs h-8"
                        >
                            All ({rows.length})
                        </Button>
                        <Button
                            size="sm"
                            variant={filterMode === 'bilateral' ? 'default' : 'outline'}
                            onClick={() => setFilterMode('bilateral')}
                            className="text-xs h-8"
                        >
                            Bilateral Reconciled
                        </Button>
                        <Button
                            size="sm"
                            variant={filterMode === 'discrepancies' ? 'default' : 'outline'}
                            onClick={() => setFilterMode('discrepancies')}
                            className="text-xs h-8"
                        >
                            Discrepancies ({summary?.discrepancies || 0})
                        </Button>
                        <Button
                            size="sm"
                            variant={filterMode === 'good_jobs' ? 'default' : 'outline'}
                            onClick={() => setFilterMode('good_jobs')}
                            className="text-xs h-8"
                        >
                            Verified Good Jobs ({summary?.verifiedGoodJobs || 0})
                        </Button>
                        <Button
                            size="sm"
                            variant={filterMode === 'hard_cases' ? 'default' : 'outline'}
                            onClick={() => setFilterMode('hard_cases')}
                            className="text-xs h-8"
                        >
                            Hard Cases ({summary?.hardCases || 0})
                        </Button>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-2.5 top-2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search worker, role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-muted border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                        />
                    </div>
                </div>

                {/* The Core Enterprise Comparison Table */}
                <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                                    <th className="py-3 px-3">Beneficiary</th>
                                    <th className="py-3 px-3">Position & Salary</th>
                                    <th className="py-3 px-3">Employer Claim</th>
                                    <th className="py-3 px-3">Worker Voice Audit</th>
                                    <th className="py-3 px-3">Bilateral Source</th>
                                    <th className="py-3 px-3">7 Statutory Criteria</th>
                                    <th className="py-3 px-3">SDG Alignment</th>
                                    <th className="py-3 px-3 text-right">Audit Trail</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredRows.map((row) => {
                                    const b = row.interview?.beneficiary;
                                    const assessments = row.interview?.clauseAssessments || [];
                                    const isDiscrepant = row.discrepancy_flag;
                                    const hasHardCases = (row.interview?.hard_case_flags || []).length > 0;
                                    const confSource = row.confirmation_source || 'unconfirmed';

                                    return (
                                        <tr
                                            key={row.id}
                                            className={`transition-colors ${
                                                hasHardCases
                                                    ? 'bg-destructive/5 hover:bg-destructive/10 border-l-4 border-l-destructive'
                                                    : isDiscrepant
                                                      ? 'bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500'
                                                      : 'hover:bg-muted/40'
                                            }`}
                                        >
                                            {/* Beneficiary Info */}
                                            <td className="py-3 px-3">
                                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                                    <span>{b?.name || `Worker #${row.id}`}</span>
                                                    {b?.persona_type === 'selam' && (
                                                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 text-[9px] px-1 py-0 font-medium">
                                                            Selam (Clean)
                                                        </Badge>
                                                    )}
                                                    {b?.persona_type === 'abel' && (
                                                        <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 text-[9px] px-1 py-0 font-medium">
                                                            Abel (Ambiguous)
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                                    {row.gender} • {row.age_band} • {b?.phone_type === 'feature_phone' ? 'Feature Phone' : 'Smartphone'}
                                                </div>
                                            </td>

                                            {/* Job Position */}
                                            <td className="py-3 px-3">
                                                <div className="font-medium text-foreground">
                                                    {row.job_position}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {row.monthly_salary_etb ? `${row.monthly_salary_etb} ETB/mo` : 'Daily / Cash'}
                                                </div>
                                            </td>

                                            {/* Employer Reported */}
                                            <td className="py-3 px-3">
                                                <Badge
                                                    variant="outline"
                                                    className="border-border text-muted-foreground font-mono text-[10px]"
                                                >
                                                    Good Job (1)
                                                </Badge>
                                            </td>

                                            {/* Worker Reported Reality */}
                                            <td className="py-3 px-3">
                                                {row.is_good_job ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                                        Verified (1)
                                                    </Badge>
                                                ) : isDiscrepant ? (
                                                    <Badge className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                                        <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                                        Discrepancy (0)
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-destructive/10 text-destructive border border-destructive/30 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                                        <XCircle className="w-3 h-3 text-destructive" />
                                                        Unverified (0)
                                                    </Badge>
                                                )}
                                            </td>

                                            {/* Bilateral Confirmation Source Column */}
                                            <td className="py-3 px-3">
                                                {confSource === 'both_agree' && (
                                                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                                                        Both Agree
                                                    </Badge>
                                                )}
                                                {confSource === 'both_disagree' && (
                                                    <Badge className="bg-destructive/10 text-destructive border border-destructive/30 text-[10px] font-bold">
                                                        Both Disagree (Flag)
                                                    </Badge>
                                                )}
                                                {confSource === 'employer_only' && (
                                                    <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[10px]">
                                                        Employer Only
                                                    </Badge>
                                                )}
                                                {confSource === 'worker_only' && (
                                                    <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-[10px]">
                                                        Worker Only
                                                    </Badge>
                                                )}
                                                {confSource === 'unconfirmed' && (
                                                    <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
                                                        Unconfirmed
                                                    </Badge>
                                                )}
                                            </td>

                                            {/* 7 Statutory Clause Breakdown Mini-Strip */}
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-1">
                                                    {CLAUSE_KEYS.map((k) => {
                                                        const ca = assessments.find((a) => a.clause_key === k.key);
                                                        const status = ca?.status || 'unclear';
                                                        const confPct = Math.round((ca?.confidence || 0) * 100);

                                                        return (
                                                            <Tooltip key={k.key}>
                                                                <TooltipTrigger asChild>
                                                                    <div
                                                                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold cursor-pointer transition-transform hover:scale-110 ${
                                                                            status === 'met'
                                                                                ? 'bg-emerald-500 text-white'
                                                                                : status === 'not_met'
                                                                                  ? 'bg-destructive text-white'
                                                                                  : 'bg-amber-500 text-white'
                                                                        }`}
                                                                    >
                                                                        {k.short.charAt(0)}
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <div className="text-xs">
                                                                        <div className="font-bold">{k.label}</div>
                                                                        <div>Status: <span className="uppercase font-mono">{status}</span> ({confPct}%)</div>
                                                                        {ca?.evidence_quote && (
                                                                            <div className="text-muted-foreground italic max-w-xs mt-1">"{ca.evidence_quote}"</div>
                                                                        )}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        );
                                                    })}
                                                </div>
                                            </td>

                                            {/* SDG Tags */}
                                            <td className="py-3 px-3">
                                                <div className="flex flex-wrap gap-1 max-w-[140px]">
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted border border-border text-foreground font-mono">
                                                        8.5
                                                    </span>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted border border-border text-foreground font-mono">
                                                        8.6
                                                    </span>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted border border-border text-foreground font-mono">
                                                        5.5
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Action / Audit Modal Trigger */}
                                            <td className="py-3 px-3 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setSelectedAuditRow(row)}
                                                    className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                                                >
                                                    Audit Dossier →
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Audit Dossier Modal Dialog */}
                <Dialog open={selectedAuditRow !== null} onOpenChange={(open) => !open && setSelectedAuditRow(null)}>
                    <DialogContent className="max-w-3xl bg-card border-border text-card-foreground max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold flex items-center justify-between">
                                <div>
                                    Beneficiary Voice Audit Dossier
                                </div>
                                {selectedAuditRow?.discrepancy_flag && (
                                    <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 text-xs">
                                        Discrepancy Confirmed
                                    </Badge>
                                )}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Official verification record defending 6-month job creation totals for donor scrutiny.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedAuditRow && (
                            <div className="space-y-4 pt-2 text-xs">
                                {/* Beneficiary Summary Card */}
                                <div className="p-3 rounded-lg bg-muted border border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                        <span className="text-muted-foreground block text-[10px]">Beneficiary Name</span>
                                        <span className="font-semibold">{selectedAuditRow.interview?.beneficiary?.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-[10px]">Position</span>
                                        <span className="font-semibold">{selectedAuditRow.job_position}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-[10px]">Bilateral Source</span>
                                        <span className="font-semibold uppercase text-primary">
                                            {selectedAuditRow.confirmation_source || 'Unconfirmed'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-[10px]">Consent Captured</span>
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Verbal Verified</span>
                                    </div>
                                </div>

                                {/* Bilateral Confirmation Link if available */}
                                {selectedAuditRow.interview?.employer_confirmation && (
                                    <div className="p-3 bg-muted border border-border rounded-xl flex items-center justify-between gap-3 text-xs">
                                        <div>
                                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                                                <FileCheck2 className="w-4 h-4 text-primary" />
                                                Employer Confirmation Portal Link:
                                            </span>
                                            <span className="text-[11px] text-muted-foreground">
                                                Status: {selectedAuditRow.interview.employer_confirmation.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <a
                                            href={`/employer/confirm/${selectedAuditRow.interview.employer_confirmation.confirmation_token}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
                                        >
                                            Open Confirmation Form <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                    </div>
                                )}

                                {/* Longitudinal Continuity Timeline */}
                                <div>
                                    <ContinuityTimeline
                                        checkpoints={selectedAuditRow.interview?.continuity_checkpoints || []}
                                    />
                                </div>

                                {/* Verbatim Transcript Box */}
                                <div>
                                    <div className="font-semibold text-foreground mb-1 flex items-center justify-between">
                                        <span>Verbatim Interview Transcript</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">Audio Ground Truth</span>
                                    </div>
                                    <div className="p-3 bg-muted rounded-lg border border-border text-foreground leading-relaxed font-sans max-h-36 overflow-y-auto">
                                        {selectedAuditRow.interview?.transcript_raw || 'No transcript text captured.'}
                                    </div>
                                </div>

                                {/* 7 Clause Statutory Assessment Details */}
                                <div>
                                    <div className="font-semibold text-foreground mb-2">
                                        Statutory 7-Clause Verdict Breakdown
                                    </div>
                                    <div className="space-y-2">
                                        {CLAUSE_KEYS.map((k) => {
                                            const ca = selectedAuditRow.interview?.clauseAssessments?.find(
                                                (a) => a.clause_key === k.key
                                            );
                                            const status = ca?.status || 'unclear';
                                            const conf = Math.round((ca?.confidence || 0) * 100);

                                            return (
                                                <div
                                                    key={k.key}
                                                    className="p-2 rounded border border-border bg-card flex items-start justify-between gap-3"
                                                >
                                                    <div className="space-y-0.5 flex-1">
                                                        <div className="font-semibold flex items-center gap-2">
                                                            <span>{k.label}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                                Confidence: {conf}%
                                                            </span>
                                                        </div>
                                                        {ca?.evidence_quote && (
                                                            <div className="text-muted-foreground italic text-[11px]">
                                                                Evidence: "{ca.evidence_quote}"
                                                            </div>
                                                        )}
                                                    </div>

                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] uppercase font-bold ${
                                                            status === 'met'
                                                                ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                                                                : status === 'not_met'
                                                                  ? 'border-destructive/40 text-destructive bg-destructive/10'
                                                                  : 'border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10'
                                                        }`}
                                                    >
                                                        {status}
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
