import { Head, Link } from '@inertiajs/react';
import {
    Award,
    Bot,
    CheckCircle2,
    ChevronRight,
    Cpu,
    FileCheck2,
    Globe,
    Layers,
    Mic,
    PhoneCall,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    UserCheck,
    Users,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrowserMockup } from '@/components/ui/browser-mockup';
import {
    CircleHighlight,
    MarkerHighlight,
    TerracottaUnderline,
    WavyUnderline,
} from '@/components/ui/editorial-annotations';

export default function Welcome() {
    return (
        <>
            <Head title="sequa — Direct Worker Good Job Verification & Multi-Agent Ledger" />

            <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary selection:text-primary-foreground transition-colors duration-200">
                {/* Clean Top Navigation */}
                <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                                <AppLogoIcon className="size-8" />
                            </div>
                            <div>
                                <span className="font-semibold text-sm tracking-tight text-foreground block">
                                    sequa Multi-Agent Verification
                                </span>
                                <span className="text-[10px] text-muted-foreground block -mt-0.5 font-mono">
                                    Ethiopia Good Jobs Programme (SICP)
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 sm:gap-3">
                            <Link href="/dashboard">
                                <Button variant="outline" size="sm" className="text-xs font-semibold rounded-lg border-border bg-card hover:bg-muted">
                                    📊 Master Ledger
                                </Button>
                            </Link>
                            <Link href="/interview">
                                <Button size="sm" className="text-xs font-semibold gap-1.5 shadow-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                                    <Mic className="w-3.5 h-3.5" /> Launch Voice Audit
                                </Button>
                            </Link>
                            <ThemeToggle />
                        </div>
                    </div>
                </header>

                {/* Hero / Editorial Section */}
                <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-20 flex-1 flex flex-col items-center text-center">
                    {/* Programme & AI Architecture Tag */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-secondary text-secondary-foreground text-xs font-medium mb-6 animate-fadeIn">
                        <span className="relative flex size-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                        </span>
                        <span className="font-semibold text-foreground">AI Builder Hackathon Addis Ababa</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-mono text-[11px] text-primary font-bold">Supervisor Fan-Out + Verifier-Critic</span>
                    </div>

                    {/* Editorial Display Heading */}
                    <h1 className="text-4xl sm:text-6xl font-normal font-serif tracking-tight text-foreground max-w-3xl leading-[1.12]">
                        Direct Worker Good Job Verification.{' '}
                        <WavyUnderline>Audited in Real Time.</WavyUnderline>
                    </h1>

                    {/* Editorial Lead Paragraph */}
                    <p className="mt-6 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
                        Replace subjective self-reporting with an autonomous multi-agent audit pipeline. Evaluate 7 statutory criteria across English, Amharic, and Afaan Oromoo, reconcile bilateral employer claims, and export cryptographic tamper-evident proof to donor agencies.
                    </p>

                    {/* Primary Hero CTAs */}
                    <div className="flex flex-wrap items-center justify-center gap-3.5 mt-8 mb-12">
                        <Link href="/dashboard">
                            <Button size="lg" className="h-11 px-5 text-sm font-semibold rounded-xl gap-2 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90">
                                <Search className="w-4 h-4" /> Explore Master Ledger Dashboard →
                            </Button>
                        </Link>
                        <Link href="/interview">
                            <Button size="lg" variant="outline" className="h-11 px-5 text-sm font-semibold rounded-xl gap-2 border-border bg-card hover:bg-muted text-foreground">
                                <Mic className="w-4 h-4 text-emerald-500" /> Start Live Voice Interview
                            </Button>
                        </Link>
                        <Link href="/demo/feature-phone">
                            <Button size="lg" variant="ghost" className="h-11 px-4 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground">
                                <PhoneCall className="w-3.5 h-3.5" /> 2G IVR Simulator
                            </Button>
                        </Link>
                    </div>

                    {/* Interactive Browser Frame Preview */}
                    <div className="w-full max-w-3xl mb-8">
                        <BrowserMockup url="https://sequa.org/dashboard" badgeText="MASTER LEDGER & AUDIT ENGINE">
                            <div className="p-5 sm:p-6 bg-card text-card-foreground flex flex-col gap-4 text-left">
                                {/* Mockup KPI Strip */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-4 border-b border-border">
                                    <div className="p-2.5 rounded-xl border border-border/80 bg-background">
                                        <div className="text-[10px] text-muted-foreground uppercase font-mono font-semibold">Programme Cohort</div>
                                        <div className="text-base font-bold text-foreground mt-0.5">23 Partner Enterprises</div>
                                    </div>
                                    <div className="p-2.5 rounded-xl border border-border/80 bg-background">
                                        <div className="text-[10px] text-muted-foreground uppercase font-mono font-semibold">Verified Good Jobs</div>
                                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">13 (57%) Confirmed</div>
                                    </div>
                                    <div className="p-2.5 rounded-xl border border-border/80 bg-background">
                                        <div className="text-[10px] text-muted-foreground uppercase font-mono font-semibold">Bilateral Mismatches</div>
                                        <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">8 Discrepancies</div>
                                    </div>
                                    <div className="p-2.5 rounded-xl border border-border/80 bg-background">
                                        <div className="text-[10px] text-muted-foreground uppercase font-mono font-semibold">Under-15 Stops</div>
                                        <div className="text-base font-bold text-destructive mt-0.5">8 Hard Cases</div>
                                    </div>
                                </div>

                                {/* Mockup Benchmark Row */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-muted/20">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                                            7/7
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-foreground flex items-center gap-2">
                                                <span>Almaz Tolessa</span>
                                                <Badge variant="outline" className="text-[9px] h-4 font-mono border-sky-500/40 text-sky-600 dark:text-sky-400">
                                                    OM • Afaan Oromoo
                                                </Badge>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                Textile Machine Operator • Adama Industrial Park • 40 hrs/wk • 5,800 ETB
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                                            ✓ Verified Good Job
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </BrowserMockup>
                    </div>

                    {/* Multi-Agent Architecture Showcase */}
                    <div className="max-w-3xl mx-auto text-center border-t border-border pt-16 pb-14 w-full">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-3">
                            <Cpu className="size-3.5 text-primary" />
                            <span>Observability & Reflection Engine</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-serif font-normal text-foreground">
                            Multi-Agent Supervisor Fan-Out with <TerracottaUnderline>Critic Reflection</TerracottaUnderline>
                        </h2>
                        <p className="mt-3 text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                            Interviews are never processed as a single LLM prompt. Specialized specialist sub-agents analyze employment facts and statutory rights concurrently, verified by an adversarial fact-checker before deterministic rule execution.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8 text-left">
                            <div className="p-4 rounded-xl border border-border bg-card text-card-foreground">
                                <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5 font-bold text-xs">
                                    01
                                </div>
                                <h3 className="font-semibold text-xs text-foreground">Supervisor Fan-Out</h3>
                                <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                                    Coordinates EmploymentFactsAgent (quantitative metrics) and RightsProtectionsAgent (4 constitutional rights).
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border border-border bg-card text-card-foreground">
                                <div className="size-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 font-bold text-xs">
                                    02
                                </div>
                                <h3 className="font-semibold text-xs text-foreground">Verifier-Critic Reflection</h3>
                                <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                                    Adversarial temperature=0 agent cross-checks extracted claims against raw audio transcripts to eliminate hallucinations.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border border-border bg-card text-card-foreground">
                                <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 font-bold text-xs">
                                    03
                                </div>
                                <h3 className="font-semibold text-xs text-foreground">Clause Rule Engine</h3>
                                <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                                    Deterministic statutory evaluator applying Ethiopian Labor Proclamation 1156/2019 without LLM drift.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 4 Trilingual Benchmark Personas */}
                    <div className="max-w-4xl mx-auto text-center border-t border-border pt-16 pb-16 w-full">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-3">
                            <Globe className="size-3.5 text-primary" />
                            <span>Comprehensive Trilingual Benchmark Suite</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-serif font-normal text-foreground">
                            Built for <CircleHighlight>Real Workers</CircleHighlight> Across Ethiopia
                        </h2>
                        <p className="mt-3 text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                            Test the full multi-turn conversational loop with live speech recognition and synthesis across 4 standardized benchmark personas.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-8 text-left">
                            <Link
                                href="/interview"
                                className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all flex flex-col justify-between group shadow-2xs"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-xs text-foreground">Selam Tesfaye</span>
                                        <Badge variant="outline" className="text-[9px] h-4 font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                            Clean (EN)
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-normal">
                                        Call Centre Agent (Addis Ababa). All 7 clauses resolve met without follow-up.
                                    </p>
                                </div>
                                <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center text-[10px] font-semibold text-primary">
                                    <span>Test Selam Audit →</span>
                                </div>
                            </Link>

                            <Link
                                href="/interview"
                                className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all flex flex-col justify-between group shadow-2xs"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-xs text-foreground">Abel Kebede</span>
                                        <Badge variant="outline" className="text-[9px] h-4 font-mono text-amber-600 dark:text-amber-400 border-amber-500/30">
                                            Amharic (AM)
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-normal">
                                        Construction Worker (Adama). Relative duration triggers context-aware Amharic follow-up probe.
                                    </p>
                                </div>
                                <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center text-[10px] font-semibold text-primary">
                                    <span>Test Abel Audit →</span>
                                </div>
                            </Link>

                            <Link
                                href="/interview"
                                className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all flex flex-col justify-between group shadow-2xs"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-xs text-foreground">Almaz Tolessa</span>
                                        <Badge variant="outline" className="text-[9px] h-4 font-mono text-sky-600 dark:text-sky-400 border-sky-500/30">
                                            Oromoo (OM)
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-normal">
                                        Textile Operator (Oromia). Native Afaan Oromoo STT/TTS with contextual probe resolution.
                                    </p>
                                </div>
                                <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center text-[10px] font-semibold text-primary">
                                    <span>Test Almaz Audit →</span>
                                </div>
                            </Link>

                            <Link
                                href="/interview"
                                className="p-4 rounded-xl border border-border bg-card hover:border-destructive/50 transition-all flex flex-col justify-between group shadow-2xs"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-xs text-foreground">Yordanos Girma</span>
                                        <Badge variant="outline" className="text-[9px] h-4 font-mono text-destructive border-destructive/30">
                                            Minor Stop
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-normal">
                                        Age 14 detected. Safety interlock terminates interview immediately, never counts toward totals.
                                    </p>
                                </div>
                                <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center text-[10px] font-semibold text-destructive">
                                    <span>Test Hard Stop →</span>
                                </div>
                            </Link>
                        </div>
                    </div>
                </main>

                {/* Minimalist Editorial Footer */}
                <footer className="border-t border-border bg-card/40 py-8">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                        <div className="font-mono text-[11px]">
                            sequa gGmbH • Sustainable Industrial Clusters Programme (SICP) Ethiopia
                        </div>
                        <div className="flex items-center gap-5 text-[11px]">
                            <Link href="/dashboard" className="hover:text-foreground transition-colors font-medium">Master Ledger</Link>
                            <Link href="/interview" className="hover:text-foreground transition-colors font-medium">Voice Audit</Link>
                            <Link href="/demo/feature-phone" className="hover:text-foreground transition-colors font-medium">2G IVR Simulator</Link>
                            <a href="/dashboard/evidence-pack" className="hover:text-foreground transition-colors font-medium">Evidence Pack (.json)</a>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
