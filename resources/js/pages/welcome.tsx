import { Head, Link } from '@inertiajs/react';
import {
    ChevronRight,
    FileCheck2,
    Mic,
    PhoneCall,
    ShieldCheck,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
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
            <Head title="sequa — Direct Worker Good Job Verification" />

            <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary selection:text-primary-foreground">
                {/* Clean Top Navigation */}
                <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                                <AppLogoIcon className="size-8" />
                            </div>
                            <div>
                                <span className="font-semibold text-sm tracking-tight text-foreground block">
                                    sequa Verification
                                </span>
                                <span className="text-[10px] text-muted-foreground block -mt-0.5 font-mono">
                                    Ethiopia Programme
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="sm" className="text-xs font-medium">
                                    Monitoring Sheet
                                </Button>
                            </Link>
                            <Link href="/interview">
                                <Button size="sm" className="text-xs font-semibold gap-1.5 shadow-xs">
                                    <Mic className="w-3.5 h-3.5" /> Launch Audit
                                </Button>
                            </Link>
                            <ThemeToggle />
                        </div>
                    </div>
                </header>

                {/* Hero / Editorial Section 1 */}
                <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-20 flex-1 flex flex-col items-center text-center">
                    {/* Small category tag */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary text-secondary-foreground text-xs font-medium mb-8">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>German Development Cooperation • sequa gGmbH</span>
                    </div>

                    {/* Editorial Display Heading */}
                    <h1 className="text-4xl sm:text-6xl font-normal font-serif tracking-tight text-foreground max-w-2xl leading-[1.15]">
                        Designed for Beneficiaries.{' '}
                        <WavyUnderline>Built for Proof.</WavyUnderline>
                    </h1>

                    {/* Editorial Lead Paragraph */}
                    <p className="mt-6 text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                        Wrap statutory compliance in clean, deterministic verification. Evaluate 7 Ethiopian labor criteria, run live bilingual voice loops in Amharic & English, and present evidence that feels finished before you ship to donors.
                    </p>

                    {/* Minimalist Browser Frame Preview */}
                    <div className="w-full max-w-2xl mt-12 mb-6">
                        <BrowserMockup url="https://sequa.org/monitoring-sheet" badgeText="LIVE AGGREGATE">
                            <div className="p-6 sm:p-8 bg-card text-card-foreground flex flex-col gap-5 text-left">
                                {/* Mockup Top Stats */}
                                <div className="flex items-center justify-between pb-4 border-b border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="size-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                            7/7
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-foreground">Selam Tesfaye • Call Centre Agent</div>
                                            <div className="text-[11px] text-muted-foreground">Addis Ababa • 40 hrs/wk • 6,500 ETB/mo</div>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-mono font-medium text-secondary-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border">
                                        100% STATUTORY MET
                                    </span>
                                </div>

                                {/* Mockup Clause Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div className="p-3 rounded-xl border border-border bg-background">
                                        <div className="text-[10px] text-muted-foreground uppercase font-mono">Age 15+</div>
                                        <div className="text-xs font-semibold text-foreground mt-0.5">22 Years</div>
                                    </div>
                                    <div className="p-3 rounded-xl border border-border bg-background">
                                        <div className="text-[10px] text-muted-foreground uppercase font-mono">Hours Clause</div>
                                        <div className="text-xs font-semibold text-foreground mt-0.5">40 hrs / wk</div>
                                    </div>
                                    <div className="p-3 rounded-xl border border-border bg-background">
                                        <div className="text-[10px] text-muted-foreground uppercase font-mono">Min. Wage</div>
                                        <div className="text-xs font-semibold text-foreground mt-0.5">6,500 ETB</div>
                                    </div>
                                    <div className="p-3 rounded-xl border border-border bg-background">
                                        <div className="text-[10px] text-muted-foreground uppercase font-mono">Reconciliation</div>
                                        <div className="text-xs font-semibold text-foreground mt-0.5">Both Agree</div>
                                    </div>
                                </div>
                            </div>
                        </BrowserMockup>
                    </div>

                    {/* Subtle Sub-link */}
                    <div className="mb-20">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
                        >
                            <span>view monitoring dashboard</span>
                            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>

                    {/* Editorial Annotation Narrative */}
                    <div className="max-w-xl mx-auto text-center border-t border-border pt-16 pb-16">
                        <p className="text-base sm:text-lg font-serif italic text-foreground leading-relaxed">
                            Draw attention where it matters most with clean, customizable{' '}
                            <CircleHighlight>voice interviews</CircleHighlight>. Add
                            targeted follow-ups to explain ambiguous duration, reconcile employer claims, and create
                            donor presentations that communicate with{' '}
                            <MarkerHighlight>clarity and legal confidence</MarkerHighlight>.
                        </p>

                        <div className="mt-4">
                            <Link
                                href="/interview"
                                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
                            >
                                <span>view live phone interview</span>
                                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                        </div>
                    </div>

                    {/* Editorial Section 2 */}
                    <div className="max-w-2xl mx-auto text-center border-t border-border pt-16 w-full">
                        <h2 className="text-3xl sm:text-4xl font-serif font-normal text-foreground">
                            <TerracottaUnderline>Designed to Verify</TerracottaUnderline> in Real Time.
                        </h2>
                        <p className="mt-4 text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                            Explore carefully designed voice verification variants that balance accessibility,
                            donor rigor, and statutory compliance across Ethiopian industrial clusters.
                        </p>

                        {/* Minimalist 3-card feature grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-10 text-left">
                            <Link
                                href="/interview"
                                className="p-5 rounded-2xl border border-border bg-card text-card-foreground hover:bg-accent/40 hover:text-accent-foreground transition-all flex flex-col justify-between group shadow-2xs"
                            >
                                <div>
                                    <div className="size-7 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center mb-3">
                                        <Mic className="w-3.5 h-3.5" />
                                    </div>
                                    <h3 className="font-semibold text-xs text-foreground tracking-tight">Smartphone Voice Agent</h3>
                                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-normal">
                                        Low-latency Addis AI Amharic & OpenAI English speech loop with live VAD turn-taking.
                                    </p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-border/50 flex items-center text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                    <span>Launch phone view</span>
                                    <ChevronRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </Link>

                            <Link
                                href="/demo/feature-phone"
                                className="p-5 rounded-2xl border border-border bg-card text-card-foreground hover:bg-accent/40 hover:text-accent-foreground transition-all flex flex-col justify-between group shadow-2xs"
                            >
                                <div>
                                    <div className="size-7 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center mb-3">
                                        <PhoneCall className="w-3.5 h-3.5" />
                                    </div>
                                    <h3 className="font-semibold text-xs text-foreground tracking-tight">Feature-Phone IVR Mode</h3>
                                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-normal">
                                        DTMF tone keypad input and transliterated Latin/Fidel display for low-tech beneficiaries.
                                    </p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-border/50 flex items-center text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                    <span>Open IVR simulator</span>
                                    <ChevronRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </Link>

                            <Link
                                href="/dashboard"
                                className="p-5 rounded-2xl border border-border bg-card text-card-foreground hover:bg-accent/40 hover:text-accent-foreground transition-all flex flex-col justify-between group shadow-2xs"
                            >
                                <div>
                                    <div className="size-7 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center mb-3">
                                        <FileCheck2 className="w-3.5 h-3.5" />
                                    </div>
                                    <h3 className="font-semibold text-xs text-foreground tracking-tight">Signed Evidence Pack</h3>
                                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-normal">
                                        HMAC-SHA256 hash chained aggregate without PII, tamper-evident and defensible to donors.
                                    </p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-border/50 flex items-center text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                    <span>Export evidence pack</span>
                                    <ChevronRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </Link>
                        </div>
                    </div>
                </main>

                {/* Minimalist Editorial Footer */}
                <footer className="border-t border-border bg-card/40 py-8">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                        <div className="font-mono text-[11px]">
                            sequa gGmbH • Sustainable Industrial Clusters Programme (SICP)
                        </div>
                        <div className="flex items-center gap-5 text-[11px]">
                            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
                            <Link href="/interview" className="hover:text-foreground transition-colors">Voice Audit</Link>
                            <Link href="/demo/feature-phone" className="hover:text-foreground transition-colors">IVR Simulator</Link>
                            <a href="/dashboard/evidence-pack" className="hover:text-foreground transition-colors">Evidence Pack (.json)</a>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
