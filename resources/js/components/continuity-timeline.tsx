import { Calendar, CheckCircle2, Clock, History, XCircle } from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';

export interface Checkpoint {
    id: number;
    beneficiary_id: number;
    interview_id: number;
    checkpoint_date: string;
    still_employed_same_role: boolean;
    cumulative_weeks_employed: number | null;
}

interface ContinuityTimelineProps {
    checkpoints: Checkpoint[];
}

export function ContinuityTimeline({ checkpoints = [] }: ContinuityTimelineProps) {
    if (!checkpoints || checkpoints.length === 0) {
        return (
            <div className="text-[11px] text-muted-foreground italic p-3 bg-muted/30 rounded-xl border border-border">
                First interview done. Next check in 3 months.
            </div>
        );
    }

    const allContinuous = checkpoints.every((c) => c.still_employed_same_role);
    const maxWeeks = Math.max(...checkpoints.map((c) => c.cumulative_weeks_employed || 0), 0);
    const meets26Weeks = maxWeeks >= 26 && allContinuous;

    return (
        <div className="space-y-3 p-4 bg-card rounded-xl border border-border text-xs">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                    <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Follow-Up Checks ({checkpoints.length} rounds)</span>
                </div>
                {meets26Weeks ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px]">
                        26+ Weeks Confirmed
                    </Badge>
                ) : (
                    <Badge className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20 text-[10px]">
                        {maxWeeks} / 26 Weeks Confirmed
                    </Badge>
                )}
            </div>

            <div className="relative pl-4 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {checkpoints.map((cp, idx) => (
                    <div key={cp.id} className="relative flex items-start justify-between gap-3 text-[11px]">
                        <div
                            className={`absolute -left-4 top-1 w-2.5 h-2.5 rounded-full border-2 border-background ${
                                cp.still_employed_same_role
                                    ? 'bg-emerald-500'
                                    : 'bg-rose-500'
                            }`}
                        />
                        <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <span>Round {idx + 1} Check-in</span>
                                <span className="text-[10px] text-muted-foreground font-normal">({cp.checkpoint_date})</span>
                            </div>
                            <div className="text-muted-foreground mt-0.5">
                                {cp.still_employed_same_role ? (
                                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                        Confirmed active in same role ({cp.cumulative_weeks_employed ?? 0} cumulative weeks)
                                    </span>
                                ) : (
                                    <span className="text-rose-700 dark:text-rose-400 font-medium">
                                        Employment discontinued / role changed
                                    </span>
                                )}
                            </div>
                        </div>

                        <span className="text-[10px] font-mono text-muted-foreground">
                            Interview #{cp.interview_id}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
