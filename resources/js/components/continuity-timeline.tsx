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
            <div className="text-[11px] text-neutral-400 dark:text-neutral-500 italic p-2 bg-neutral-100/50 dark:bg-neutral-950/40 rounded-lg">
                Single interview recorded — round 1 baseline established. Re-check scheduled for 3-month mark.
            </div>
        );
    }

    const allContinuous = checkpoints.every((c) => c.still_employed_same_role);
    const maxWeeks = Math.max(...checkpoints.map((c) => c.cumulative_weeks_employed || 0), 0);
    const meets26Weeks = maxWeeks >= 26 && allContinuous;

    return (
        <div className="space-y-2 p-3 bg-neutral-50 dark:bg-neutral-950/80 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-white">
                    <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Longitudinal Continuity Checkpoints ({checkpoints.length} rounds)</span>
                </div>
                {meets26Weeks ? (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[10px]">
                        26+ Weeks Continuous Verified
                    </Badge>
                ) : (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[10px]">
                        {maxWeeks} / 26 Weeks Confirmed
                    </Badge>
                )}
            </div>

            <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
                {checkpoints.map((cp, idx) => (
                    <div key={cp.id} className="relative flex items-start justify-between gap-3 text-[11px]">
                        <div
                            className={`absolute -left-4 top-1 w-2.5 h-2.5 rounded-full border-2 ${
                                cp.still_employed_same_role
                                    ? 'bg-emerald-500 border-white dark:border-neutral-900'
                                    : 'bg-rose-500 border-white dark:border-neutral-900'
                            }`}
                        />
                        <div>
                            <div className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                                <span>Round {idx + 1} Check-in</span>
                                <span className="text-[10px] text-neutral-400 font-normal">({cp.checkpoint_date})</span>
                            </div>
                            <div className="text-neutral-500 dark:text-neutral-400">
                                {cp.still_employed_same_role ? (
                                    <span className="text-emerald-700 dark:text-emerald-400">
                                        Confirmed active in same role ({cp.cumulative_weeks_employed ?? 0} cumulative weeks)
                                    </span>
                                ) : (
                                    <span className="text-rose-700 dark:text-rose-400">
                                        Employment discontinued / role changed
                                    </span>
                                )}
                            </div>
                        </div>

                        <span className="text-[10px] font-mono text-neutral-400">
                            Interview #{cp.interview_id}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
