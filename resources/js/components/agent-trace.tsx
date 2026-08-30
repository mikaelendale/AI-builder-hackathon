import React, { useState, useEffect, useRef } from 'react';
import { 
    Activity, 
    ChevronDown, 
    ChevronRight, 
    Copy, 
    Check, 
    ShieldCheck, 
    AlertTriangle, 
    Cpu, 
    Layers, 
    Filter,
    Clock,
    Terminal,
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface TraceEvent {
    id: number;
    interview_id: number;
    agent_name: string;
    event_type: 'started' | 'tool_call' | 'completed' | 'flagged' | 'rule_verdict' | string;
    summary: string;
    duration_ms?: number | null;
    detail?: Record<string, any> | null;
    occurred_at: string;
}

interface AgentTraceProps {
    interviewId?: number;
    initialEvents?: TraceEvent[];
    isLiveStreaming?: boolean;
    className?: string;
    docked?: boolean;
}

const AGENT_CONFIG: Record<string, { label: string; short: string; color: string; border: string; bg: string; text: string }> = {
    InterviewSupervisorAgent: {
        label: 'Supervisor',
        short: 'SUP',
        color: 'text-sky-600 dark:text-sky-400',
        border: 'border-sky-500/30',
        bg: 'bg-sky-500/10',
        text: 'text-sky-600 dark:text-sky-400',
    },
    Supervisor: {
        label: 'Supervisor',
        short: 'SUP',
        color: 'text-sky-600 dark:text-sky-400',
        border: 'border-sky-500/30',
        bg: 'bg-sky-500/10',
        text: 'text-sky-600 dark:text-sky-400',
    },
    EmploymentFactsAgent: {
        label: 'EmploymentFacts',
        short: 'FACTS',
        color: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/30',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
    RightsProtectionsAgent: {
        label: 'RightsProtections',
        short: 'RIGHTS',
        color: 'text-violet-600 dark:text-violet-400',
        border: 'border-violet-500/30',
        bg: 'bg-violet-500/10',
        text: 'text-violet-600 dark:text-violet-400',
    },
    ExtractionVerifierAgent: {
        label: 'VerifierCritic',
        short: 'CRITIC',
        color: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/10',
        text: 'text-amber-600 dark:text-amber-400',
    },
    ClauseRuleEngine: {
        label: 'RuleEngine',
        short: 'ENGINE',
        color: 'text-teal-600 dark:text-teal-400',
        border: 'border-teal-500/30',
        bg: 'bg-teal-500/10',
        text: 'text-teal-600 dark:text-teal-400',
    },
};

export function AgentTrace({
    interviewId,
    initialEvents = [],
    isLiveStreaming = false,
    className = '',
    docked = false,
}: AgentTraceProps) {
    const [events, setEvents] = useState<TraceEvent[]>(initialEvents);
    const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});
    const [filterAgent, setFilterAgent] = useState<string>('all');
    const [autoScroll, setAutoScroll] = useState<boolean>(true);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Synchronize initialEvents
    useEffect(() => {
        if (initialEvents && initialEvents.length > 0) {
            setEvents(initialEvents);
        }
    }, [initialEvents]);

    // Live polling when isLiveStreaming and interviewId is provided
    useEffect(() => {
        if (!isLiveStreaming || !interviewId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/interviews/${interviewId}/trace`, {
                    headers: { Accept: 'application/json' },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.trace_events && Array.isArray(data.trace_events)) {
                        setEvents(data.trace_events);
                    }
                }
            } catch (err) {
                // Silently skip transient polling glitches
            }
        }, 1200);

        return () => clearInterval(interval);
    }, [isLiveStreaming, interviewId]);

    // Auto scroll to bottom
    useEffect(() => {
        if (autoScroll && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [events, autoScroll]);

    const toggleExpand = (id: number) => {
        setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCopyPayload = (e: React.MouseEvent, id: number, detail: any) => {
        e.stopPropagation();
        navigator.clipboard.writeText(JSON.stringify(detail, null, 2));
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1800);
    };

    const formatTimestamp = (ts: string) => {
        try {
            const d = new Date(ts);
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            const ss = String(d.getSeconds()).padStart(2, '0');
            const ms = String(d.getMilliseconds()).padStart(3, '0');
            return `${hh}:${mm}:${ss}.${ms}`;
        } catch {
            return ts;
        }
    };

    const filteredEvents = events.filter((e) => {
        if (filterAgent === 'all') return true;
        const cfg = AGENT_CONFIG[e.agent_name];
        return cfg?.label.toLowerCase() === filterAgent.toLowerCase() || e.agent_name.toLowerCase().includes(filterAgent.toLowerCase());
    });

    return (
        <div className={`flex flex-col bg-card/95 border border-border/80 rounded-2xl shadow-sm overflow-hidden text-xs ${className}`}>
            {/* Header with Live beacon & technical title */}
            <div className="px-4 py-3 border-b border-border/70 bg-muted/20 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                    <div className="relative flex size-2 items-center justify-center">
                        {isLiveStreaming ? (
                            <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                            </>
                        ) : (
                            <span className="relative inline-flex rounded-full size-2 bg-muted-foreground/40" />
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider font-semibold text-foreground">
                        <Terminal className="size-3.5 text-primary" />
                        <span>Agent Trace — Multi-Agent Observability</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] h-4.5 px-1.5 border-border/60 text-muted-foreground">
                        {events.length} {events.length === 1 ? 'event' : 'events'}
                    </Badge>
                </div>

                {/* Filter and toggle controls */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        {['all', 'Supervisor', 'EmploymentFacts', 'RightsProtections', 'VerifierCritic', 'RuleEngine'].map((agentKey) => (
                            <button
                                key={agentKey}
                                type="button"
                                onClick={() => setFilterAgent(agentKey)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                    filterAgent === agentKey
                                        ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                            >
                                {agentKey === 'all' ? 'All' : agentKey.replace('Agent', '')}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border border-border/60 transition-colors ${
                            autoScroll ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground opacity-60'
                        }`}
                        title="Auto-scroll on incoming trace events"
                    >
                        Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            {/* Event lines stream */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-3.5 space-y-2 font-mono text-[11px] leading-relaxed max-h-[380px] bg-background/50"
            >
                {filteredEvents.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground/70 space-y-2">
                        <Cpu className="size-6 text-muted-foreground/40 animate-pulse" />
                        <p className="text-xs font-mono">
                            {isLiveStreaming
                                ? 'Awaiting multi-agent supervisor dispatch...'
                                : 'No trace events recorded for this interview session yet.'}
                        </p>
                    </div>
                ) : (
                    filteredEvents.map((e, idx) => {
                        const cfg = AGENT_CONFIG[e.agent_name] || {
                            label: e.agent_name,
                            short: e.agent_name.slice(0, 4).toUpperCase(),
                            color: 'text-foreground',
                            border: 'border-border/60',
                            bg: 'bg-muted/40',
                            text: 'text-muted-foreground',
                        };

                        const isFlagged = e.event_type === 'flagged';
                        const isExpanded = !!expandedIds[e.id];
                        const hasDetail = e.detail && Object.keys(e.detail).length > 0;

                        return (
                            <div
                                key={e.id || idx}
                                className={`group rounded-xl border transition-all duration-150 p-2.5 flex flex-col gap-1.5 ${
                                    isFlagged
                                        ? 'bg-rose-500/[0.04] border-rose-500/40'
                                        : 'bg-card/60 border-border/60 hover:border-border hover:bg-card/90'
                                }`}
                            >
                                <div
                                    className="flex items-start justify-between gap-2 cursor-pointer select-none"
                                    onClick={() => hasDetail && toggleExpand(e.id)}
                                >
                                    <div className="flex items-start gap-2 min-w-0">
                                        <span className="text-[10px] text-muted-foreground/70 shrink-0 font-mono mt-0.5">
                                            {formatTimestamp(e.occurred_at)}
                                        </span>

                                        {/* Agent Badge */}
                                        <span
                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                                        >
                                            {cfg.label}
                                        </span>

                                        {/* Event Summary */}
                                        <span
                                            className={`text-xs font-normal break-words ${
                                                isFlagged ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-foreground'
                                            }`}
                                        >
                                            {e.summary}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                        {e.duration_ms !== null && e.duration_ms !== undefined && (
                                            <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border/50">
                                                {e.duration_ms}ms
                                            </span>
                                        )}

                                        {hasDetail && (
                                            <button
                                                type="button"
                                                className="text-muted-foreground hover:text-foreground transition-transform"
                                                title="Toggle JSON inspector"
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="size-3.5 text-primary" />
                                                ) : (
                                                    <ChevronRight className="size-3.5 text-muted-foreground" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Expandable JSON Payload Inspector */}
                                {isExpanded && hasDetail && (
                                    <div className="mt-2 pt-2 border-t border-border/60 space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                            <span className="font-semibold uppercase tracking-wider text-foreground">
                                                Structured Payload ({e.agent_name})
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(evt) => handleCopyPayload(evt, e.id, e.detail)}
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
                                            >
                                                {copiedId === e.id ? (
                                                    <>
                                                        <Check className="size-3 text-emerald-500" />
                                                        <span className="text-emerald-500 font-bold">Copied!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="size-3 text-muted-foreground" />
                                                        <span>Copy JSON</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <pre className="p-2.5 rounded-lg bg-neutral-950 text-neutral-200 text-[10px] overflow-x-auto border border-border/50 font-mono leading-relaxed">
                                            {JSON.stringify(e.detail, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}