import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Building2,
    CheckCircle2,
    Clock,
    FileCheck2,
    Lock,
    Send,
    Shield,
    ShieldAlert,
    Sparkles,
    XCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EmployerConfirmProps {
    confirmation: {
        token: string;
        status: 'pending' | 'confirmed' | 'disputed' | 'expired';
        hours_per_week: number | null;
        months_employed: number | null;
        note: string | null;
        expires_at: string;
        is_expired: boolean;
        responded_at: string | null;
    };
    job_position: string;
    interview_id: number;
}

export default function EmployerConfirmPage({
    confirmation,
    job_position,
    interview_id,
}: EmployerConfirmProps) {
    const [hoursPerWeek, setHoursPerWeek] = useState<number | ''>(
        confirmation.hours_per_week ?? 40
    );
    const [monthsEmployed, setMonthsEmployed] = useState<number | ''>(
        confirmation.months_employed ?? 6
    );
    const [note, setNote] = useState(confirmation.note ?? '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedStatus, setSubmittedStatus] = useState<string | null>(
        confirmation.status !== 'pending' ? confirmation.status : null
    );

    const handleSubmit = (action: 'confirmed' | 'disputed') => {
        if (hoursPerWeek === '' || monthsEmployed === '') {
            alert('Please specify both weekly hours and months employed.');
            return;
        }

        setIsSubmitting(true);
        router.post(
            `/employer/confirm/${confirmation.token}`,
            {
                status: action,
                employer_reported_hours_per_week: Number(hoursPerWeek),
                employer_reported_months_employed: Number(monthsEmployed),
                employer_note: note,
            },
            {
                onSuccess: () => {
                    setSubmittedStatus(action);
                    setIsSubmitting(false);
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            }
        );
    };

    return (
        <>
            <Head title="Partner Employer Bilateral Confirmation — sequa Ethiopia" />

            <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-200">
                {/* Top Navigation */}
                <div className="w-full max-w-xl mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                        <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-semibold text-neutral-900 dark:text-white">Partner Enterprise Portal</span>
                        <span>• Official Verification</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </div>

                {/* Main Confirmation Card */}
                <Card className="w-full max-w-xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-xl">
                    <CardHeader className="border-b border-neutral-200 dark:border-neutral-800 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileCheck2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                <CardTitle className="text-lg font-bold">
                                    Bilateral Employment Confirmation
                                </CardTitle>
                            </div>
                            {confirmation.is_expired ? (
                                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800">
                                    Expired (72h elapsed)
                                </Badge>
                            ) : submittedStatus ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800">
                                    Submitted: {submittedStatus.toUpperCase()}
                                </Badge>
                            ) : (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800">
                                    Pending Employer Input
                                </Badge>
                            )}
                        </div>
                        <CardDescription className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            Per sequa Ethiopia 6-month monitoring guidelines: 6-month continuity can be confirmed either by worker or employer.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-5 space-y-5 text-xs sm:text-sm">
                        {/* Expiration Notice */}
                        {confirmation.is_expired && (
                            <Alert className="border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200">
                                <ShieldAlert className="h-4 w-4 text-rose-600" />
                                <AlertTitle className="text-xs font-bold">Link Expired</AlertTitle>
                                <AlertDescription className="text-xs mt-1">
                                    This single-use confirmation token has expired. The worker's independent interview verdict will stand alone per programme rules.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Privacy / PII Safe Header */}
                        <div className="p-3.5 bg-neutral-100 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">Position / Role Under Review</span>
                                <span className="text-sm font-bold text-neutral-900 dark:text-white">{job_position}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                                <span>PII Redacted</span>
                            </div>
                        </div>

                        {/* Submitted Success Banner */}
                        {submittedStatus && (
                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1.5">
                                <div className="font-bold flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    Bilateral Confirmation Recorded
                                </div>
                                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                                    Reported: {hoursPerWeek} hrs/week over {monthsEmployed} months. This record has been reconciled into the official 6-month monitoring sheet.
                                </p>
                            </div>
                        )}

                        {/* Form Inputs */}
                        {!confirmation.is_expired && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                                        1. Average Hours Worked Per Week:
                                    </label>
                                    <div className="relative">
                                        <Clock className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                                        <input
                                            type="number"
                                            min={0}
                                            max={168}
                                            disabled={Boolean(submittedStatus)}
                                            value={hoursPerWeek}
                                            onChange={(e) => setHoursPerWeek(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="e.g. 40"
                                            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Statutory requirement: ≥ 20 hours per week.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                                        2. Total Consecutive Months Employed:
                                    </label>
                                    <div className="relative">
                                        <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                                        <input
                                            type="number"
                                            min={0}
                                            max={120}
                                            disabled={Boolean(submittedStatus)}
                                            value={monthsEmployed}
                                            onChange={(e) => setMonthsEmployed(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="e.g. 6"
                                            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Statutory requirement: ≥ 6 months (26 weeks) or 520 hours/year.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                                        3. Employer Comments / Notes (Optional):
                                    </label>
                                    <textarea
                                        rows={3}
                                        disabled={Boolean(submittedStatus)}
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Add any context on seasonal shifts, payroll records, or attendance logs..."
                                        className="w-full p-2.5 text-xs sm:text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                {/* Submit Actions */}
                                {!submittedStatus && (
                                    <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                                        <Button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => handleSubmit('confirmed')}
                                            className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 shadow-sm"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirm Record (Meets Threshold)
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={isSubmitting}
                                            onClick={() => handleSubmit('disputed')}
                                            className="w-full sm:w-auto border-neutral-300 dark:border-neutral-700 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs h-10"
                                        >
                                            <XCircle className="w-4 h-4 mr-1.5" /> Dispute Record
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Footer Note */}
                <div className="w-full max-w-xl mt-4 text-center text-[11px] text-neutral-500 dark:text-neutral-400">
                    sequa Ethiopia • Sustainable Industrial Clusters Programme (SICP) • Verification Engine
                </div>
            </div>
        </>
    );
}
