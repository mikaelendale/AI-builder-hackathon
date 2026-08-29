import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Award,
    CheckCircle2,
    Clock,
    DollarSign,
    Globe,
    HelpCircle,
    Mic,
    MicOff,
    Play,
    Radio,
    RefreshCcw,
    Send,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    UserCheck,
    Users,
    Volume2,
    XCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Beneficiary {
    id: number;
    name: string;
    persona_type: 'selam' | 'abel' | 'synthetic';
    phone_type: 'smartphone' | 'feature_phone';
    language: 'en' | 'am';
}

interface ClauseVerdict {
    status: 'met' | 'not_met' | 'unclear' | 'pending';
    confidence: number;
    evidence_quote?: string | null;
    reason?: string;
    sdg_tags?: string[];
}

interface FollowUp {
    clause_key: string;
    question: string;
    ambiguous_quote?: string | null;
    reason?: string;
}

interface InterviewProps {
    beneficiaries: Beneficiary[];
    interview?: {
        id: number;
        beneficiary_id: number;
        status: string;
        transcript_raw: string | null;
        consent_given: boolean;
        beneficiary: Beneficiary;
        clause_assessments: Array<{
            clause_key: string;
            status: 'met' | 'not_met' | 'unclear';
            confidence: number;
            evidence_quote: string | null;
            sdg_tags: string[];
        }>;
        hard_case_flags: Array<{
            type: string;
            detail: string;
        }>;
    } | null;
}

const CLAUSE_DEFINITIONS: Record<
    string,
    { label: string; short: string; sdg: string; icon: React.ComponentType<{ className?: string }> }
> = {
    age_15_plus: { label: 'Age 15+ Threshold', short: 'Age 15+', sdg: 'SDG 8.6', icon: UserCheck },
    hours_threshold: { label: '20h/wk (26 wks) or 520h/yr', short: 'Duration/Hours', sdg: 'SDG 8.5', icon: Clock },
    min_wage: { label: 'Legal Minimum Wage', short: 'Fair Wage', sdg: 'SDG 1.2', icon: DollarSign },
    no_child_labor: { label: 'No Child Labour', short: 'No Child Labour', sdg: 'SDG 8.7', icon: ShieldCheck },
    no_forced_labor: { label: 'No Forced Labour / Coercion', short: 'Free Consent', sdg: 'SDG 8.8', icon: Shield },
    no_discrimination: { label: 'Non-Discrimination & Equal Pay', short: 'Equal Treatment', sdg: 'SDG 5.5', icon: Users },
    freedom_of_association: { label: 'Freedom of Association', short: 'Union Rights', sdg: 'SDG 8.8', icon: Award },
};

const PERSONA_SCRIPTS = {
    selam: {
        name: 'Selam Tesfaye',
        age: 22,
        role: 'Call Centre Agent (Addis Ababa)',
        lang: 'en',
        type: 'selam' as const,
        description:
            'Selam, 22, Addis Ababa. Trained free in sales, placed in a call centre 6 months ago, paid monthly. Smartphone, limited data bundle. Nobody has asked her whether a contract exists or pension is deducted. → Clean case. English. All clauses resolve met with high confidence.',
        script:
            'Hello. My name is Selam Tesfaye, I am 22 years old. I was placed in a call centre in Addis Ababa 6 months ago. I work 40 hours per week, Monday through Friday, 8 hours a day. I am paid 6500 ETB monthly with direct bank deposit and pension deducted. I am free to join the workers group, there is no discrimination, no forced labour, and I started this job as an adult.',
    },
    abel: {
        name: 'Abel Kebede',
        age: 19,
        role: 'Construction Daily Worker (Adama)',
        lang: 'am',
        type: 'abel' as const,
        description:
            "Abel, 19, construction site outside Adama. Daily/seasonal worker, paid in cash. Feature phone, Amharic only, reads poorly. Started 'after the rains' — he cannot say if that's 5 or 7 months. → Ambiguous case. Amharic. The hours/duration clause resolves unclear, triggering a targeted follow-up probe. (Central 'we don't guess' moment).",
        script:
            'ስሜ አቤል ከበደ ይባላል። ዕድሜዬ 19 ዓመት ነው። በአዳማ ከተማ አቅራቢያ በኮንስትራክሽን ቦታ ላይ በቀን ሠራተኛነት እሠራለሁ። ክፍያዬን በጥሬ ገንዘብ ነው የማገኘው። ሥራውን የጀመርኩት ከክረምቱ በኋላ ነው፣ አምስት ወይም ሰባት ወር ሊሆን ይችላል፣ ሥራ በተገኘበት ቀን ብቻ ነው የምሠራው።',
        followUpAnswer: 'በተለመደው ሳምንት ውስጥ 35 ሰዓት እሠራለሁ፣ እና ከጀመርኩ 6 ወር ሆኖኛል።',
    },
    minor: {
        name: 'Yordanos Girma',
        age: 14,
        role: 'Packaging Assistant (Under-15 Minor)',
        lang: 'en',
        type: 'synthetic' as const,
        description: 'Under-15 detected → interview stops immediately, flags to hard_case_flags, never counts.',
        script:
            'Hello, my name is Yordanos Girma. I am 14 years old. I work helping at the packaging workshop after school hours for 15 hours a week.',
    },
};

export default function InterviewPage({ beneficiaries, interview: initialInterview }: InterviewProps) {
    const [selectedPersona, setSelectedPersona] = useState<'selam' | 'abel' | 'minor' | 'custom'>('selam');
    const [currentInterviewId, setCurrentInterviewId] = useState<number | null>(initialInterview?.id || null);
    const [consentGiven, setConsentGiven] = useState(true);
    const [transcript, setTranscript] = useState('');
    const [displayedTranscript, setDisplayedTranscript] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
    const [stoppedHardCase, setStoppedHardCase] = useState(false);
    const [hardCaseDetail, setHardCaseDetail] = useState<string | null>(null);
    const [followUps, setFollowUps] = useState<FollowUp[]>([]);
    const [activeFollowUpAnswer, setActiveFollowUpAnswer] = useState('');
    const [isCompleted, setIsCompleted] = useState(initialInterview?.status === 'completed');
    const [audioProviderNotice, setAudioProviderNotice] = useState<string | null>(null);

    const [verdicts, setVerdicts] = useState<Record<string, ClauseVerdict>>(() => {
        const initial: Record<string, ClauseVerdict> = {};
        Object.keys(CLAUSE_DEFINITIONS).forEach((k) => {
            initial[k] = { status: 'pending', confidence: 0 };
        });
        return initial;
    });

    const streamTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const speechRecognitionRef = useRef<any>(null);

    // If initial interview exists, populate verdicts
    useEffect(() => {
        if (initialInterview) {
            setCurrentInterviewId(initialInterview.id);
            setTranscript(initialInterview.transcript_raw || '');
            setDisplayedTranscript(initialInterview.transcript_raw || '');
            if (initialInterview.status === 'stopped_hard_case') {
                setStoppedHardCase(true);
                setHardCaseDetail(initialInterview.hard_case_flags[0]?.detail || 'Under 15 hard stop');
            }
            if (initialInterview.clause_assessments) {
                const updated: Record<string, ClauseVerdict> = {};
                initialInterview.clause_assessments.forEach((ca) => {
                    updated[ca.clause_key] = {
                        status: ca.status,
                        confidence: ca.confidence,
                        evidence_quote: ca.evidence_quote,
                        sdg_tags: ca.sdg_tags,
                    };
                });
                setVerdicts((prev) => ({ ...prev, ...updated }));
            }
        }
    }, [initialInterview]);

    // Streaming typed reveal effect for live transcript
    const streamRevealText = (fullText: string, onComplete?: () => void) => {
        setIsStreaming(true);
        let currentIndex = 0;
        setDisplayedTranscript('');

        if (streamTimeoutRef.current) {
            clearInterval(streamTimeoutRef.current);
        }

        const interval = setInterval(() => {
            currentIndex += 3;
            if (currentIndex >= fullText.length) {
                setDisplayedTranscript(fullText);
                setIsStreaming(false);
                clearInterval(interval);
                onComplete?.();
            } else {
                setDisplayedTranscript(fullText.slice(0, currentIndex));
            }
        }, 20);

        streamTimeoutRef.current = interval as unknown as NodeJS.Timeout;
    };

    // Text to Speech for questions & follow-ups
    const speakText = (text: string, lang = 'en-US') => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            if (lang.startsWith('am')) {
                utterance.lang = 'am-ET';
            } else {
                utterance.lang = 'en-US';
            }
            window.speechSynthesis.speak(utterance);
        }
    };

    // Start a new interview
    const handleStartInterview = async (personaKey: 'selam' | 'abel' | 'minor') => {
        setSelectedPersona(personaKey);
        setStoppedHardCase(false);
        setHardCaseDetail(null);
        setFollowUps([]);
        setIsCompleted(false);

        const p = PERSONA_SCRIPTS[personaKey];
        const initialV: Record<string, ClauseVerdict> = {};
        Object.keys(CLAUSE_DEFINITIONS).forEach((k) => {
            initialV[k] = { status: 'pending', confidence: 0 };
        });
        setVerdicts(initialV);

        // Find or use matching beneficiary
        let targetBeneficiary = beneficiaries.find((b) => b.persona_type === p.type);
        if (!targetBeneficiary && beneficiaries.length > 0) {
            targetBeneficiary = beneficiaries[0];
        }

        if (!targetBeneficiary) {
            alert('Please run database seeders to populate initial beneficiaries.');
            return;
        }

        try {
            const res = await fetch(`/beneficiaries/${targetBeneficiary.id}/interviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ consent_given: consentGiven }),
            });
            const data = await res.json();
            setCurrentInterviewId(data.interview_id);

            // Stream script text and submit
            setTranscript(p.script);
            streamRevealText(p.script, () => {
                submitTranscriptText(data.interview_id, p.script);
            });
        } catch (err) {
            console.error('Failed to start interview:', err);
        }
    };

    // Submit transcript to server (Structured Groq extraction -> Plain PHP Rule Engine)
    const submitTranscriptText = async (interviewId: number, textToSend: string) => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/interviews/${interviewId}/transcript`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ transcript: textToSend }),
            });
            const data = await res.json();

            if (data.stopped) {
                setStoppedHardCase(true);
                setHardCaseDetail(data.message || 'Hard stop: Minor under 15 detected.');
                if (data.verdicts) {
                    setVerdicts((prev) => ({ ...prev, ...data.verdicts }));
                }
            } else {
                if (data.verdicts) {
                    setVerdicts((prev) => ({ ...prev, ...data.verdicts }));
                }
                if (data.follow_ups && data.follow_ups.length > 0) {
                    setFollowUps(data.follow_ups);
                    // Automatically voice the first follow-up question
                    speakText(data.follow_ups[0].question, selectedPersona === 'abel' ? 'am' : 'en');
                } else {
                    setFollowUps([]);
                }
            }
        } catch (err) {
            console.error('Error processing transcript:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Real mic audio recording using MediaRecorder & Groq Whisper STT
    const startMicRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach((track) => track.stop());
                await uploadAudioForTranscription(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);

            // Optional Web Speech API live preview
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = selectedPersona === 'abel' ? 'am-ET' : 'en-US';

                recognition.onresult = (event: any) => {
                    let interim = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        interim += event.results[i][0].transcript;
                    }
                    if (interim) {
                        setDisplayedTranscript((prev) => (prev ? `${prev} ${interim}` : interim));
                    }
                };

                recognition.start();
                speechRecognitionRef.current = recognition;
            }
        } catch (err) {
            console.warn('Microphone permission denied or not available, falling back to simulated voice:', err);
            // Fallback to simulated persona
            if (selectedPersona === 'selam') {
                handleStartInterview('selam');
            } else if (selectedPersona === 'abel') {
                handleStartInterview('abel');
            } else {
                handleStartInterview('minor');
            }
        }
    };

    const stopMicRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (speechRecognitionRef.current) {
            try {
                speechRecognitionRef.current.stop();
            } catch (e) {}
        }
        setIsRecording(false);
    };

    // Upload audio blob to backend Groq Whisper endpoint
    const uploadAudioForTranscription = async (blob: Blob) => {
        setIsTranscribingAudio(true);
        try {
            const formData = new FormData();
            formData.append('audio', blob, 'voice-interview.webm');

            const res = await fetch('/api/audio/transcribe', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: formData,
            });

            const data = await res.json();
            if (data.text) {
                setAudioProviderNotice(data.provider || 'Groq Whisper Turbo');
                const newText = data.text;
                setTranscript((prev) => (prev ? `${prev}\n${newText}` : newText));
                setDisplayedTranscript((prev) => (prev ? `${prev}\n${newText}` : newText));

                // Ensure an interview is started if none exists
                let interviewId = currentInterviewId;
                if (!interviewId) {
                    const defaultBeneficiary = beneficiaries[0];
                    if (defaultBeneficiary) {
                        const startRes = await fetch(`/beneficiaries/${defaultBeneficiary.id}/interviews`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                            },
                            body: JSON.stringify({ consent_given: consentGiven }),
                        });
                        const startData = await startRes.json();
                        interviewId = startData.interview_id;
                        setCurrentInterviewId(interviewId);
                    }
                }

                if (interviewId) {
                    submitTranscriptText(interviewId, newText);
                }
            }
        } catch (err) {
            console.error('Error transcribing audio:', err);
        } finally {
            setIsTranscribingAudio(false);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopMicRecording();
        } else {
            startMicRecording();
        }
    };

    // Handle answering follow up probe
    const handleAnswerFollowUp = (followUp: FollowUp) => {
        if (!currentInterviewId) return;

        const answerText =
            activeFollowUpAnswer.trim() ||
            (selectedPersona === 'abel' ? PERSONA_SCRIPTS.abel.followUpAnswer : 'I work 40 hours per week and have worked for 7 months.');

        const combined = `${transcript}\n[Follow-up question on ${followUp.clause_key}]: ${followUp.question}\n[Beneficiary Response]: ${answerText}`;
        setTranscript(combined);
        setDisplayedTranscript(combined);
        setActiveFollowUpAnswer('');
        setFollowUps([]);

        submitTranscriptText(currentInterviewId, `[Follow-up Response]: ${answerText}`);
    };

    // Complete interview & navigate to dashboard
    const handleCompleteInterview = async () => {
        if (!currentInterviewId) return;

        try {
            await fetch(`/interviews/${currentInterviewId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    job_position:
                        selectedPersona === 'selam'
                            ? 'Call Centre Agent'
                            : selectedPersona === 'abel'
                              ? 'Construction Daily Labourer'
                              : 'General Beneficiary',
                }),
            });
            setIsCompleted(true);
            router.visit('/dashboard');
        } catch (err) {
            console.error('Error completing interview:', err);
        }
    };

    return (
        <>
            <Head title="Live Beneficiary Voice Interview (Phase 3 Voice Loop)" />

            <div className="min-h-screen bg-neutral-950 py-4 px-2 sm:px-4 text-neutral-100 flex flex-col items-center justify-start">
                {/* Stage Header Info Banner */}
                <div className="w-full max-w-[420px] mb-3 flex items-center justify-between px-2 text-xs text-neutral-400">
                    <div className="flex items-center gap-1.5 font-medium text-emerald-400">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>Groq Voice Loop • Whisper STT</span>
                    </div>
                    <Badge variant="outline" className="border-neutral-800 text-[10px] text-neutral-400 bg-neutral-900/60">
                        Phone Viewport (390px)
                    </Badge>
                </div>

                {/* Main Phone Viewport Container */}
                <div className="w-full max-w-[410px] bg-neutral-900 border border-neutral-800 rounded-[2.5rem] shadow-2xl shadow-emerald-950/20 overflow-hidden flex flex-col min-h-[780px] relative">
                    {/* Simulated Phone Notch / Speaker Island */}
                    <div className="w-full pt-3 pb-2 px-6 flex items-center justify-between bg-neutral-900/90 backdrop-blur border-b border-neutral-800/80">
                        <span className="text-[11px] font-semibold text-neutral-400">9:41 AM</span>
                        <div className="w-20 h-4 bg-neutral-950 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-neutral-800 rounded-full mr-2"></div>
                            <div className="w-3 h-1 bg-neutral-800 rounded-full"></div>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
                            <span>5G</span>
                            <span>100%</span>
                        </div>
                    </div>

                    {/* App Header */}
                    <div className="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
                        <div>
                            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                Voice Beneficiary Audit
                            </h1>
                            <p className="text-[11px] text-neutral-400">Direct 1-on-1 Programme Verification</p>
                        </div>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.visit('/dashboard')}
                            className="h-7 text-xs border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                        >
                            Dashboard →
                        </Button>
                    </div>

                    {/* Persona Selector (Stage Quick Switcher) */}
                    <div className="p-3 bg-neutral-950/60 border-b border-neutral-800">
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 mb-1.5 flex items-center justify-between">
                            <span>Select Live Demo Persona:</span>
                            <span className="text-emerald-400 font-mono">Zero-Guessing Core</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleStartInterview('selam')}
                                className={`p-2 rounded-xl text-left border transition-all ${
                                    selectedPersona === 'selam'
                                        ? 'border-emerald-500/80 bg-emerald-950/30 text-emerald-300 ring-1 ring-emerald-500/40'
                                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                                }`}
                            >
                                <div className="text-xs font-bold text-white flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    Selam (22)
                                </div>
                                <div className="text-[10px] text-neutral-400 truncate">Clean Case (EN)</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleStartInterview('abel')}
                                className={`p-2 rounded-xl text-left border transition-all ${
                                    selectedPersona === 'abel'
                                        ? 'border-amber-500/80 bg-amber-950/30 text-amber-300 ring-1 ring-amber-500/40'
                                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                                }`}
                            >
                                <div className="text-xs font-bold text-white flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                    Abel (19)
                                </div>
                                <div className="text-[10px] text-neutral-400 truncate">Ambiguous (AM)</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleStartInterview('minor')}
                                className={`p-2 rounded-xl text-left border transition-all ${
                                    selectedPersona === 'minor'
                                        ? 'border-rose-500/80 bg-rose-950/30 text-rose-300 ring-1 ring-rose-500/40'
                                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                                }`}
                            >
                                <div className="text-xs font-bold text-white flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                    Yordanos (14)
                                </div>
                                <div className="text-[10px] text-neutral-400 truncate">Under-15 Stop</div>
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Live Interview Area */}
                    <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[500px]">
                        {/* Consent & Ethics Pill */}
                        <div className="p-2 rounded-lg bg-neutral-950/80 border border-neutral-800 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5 text-neutral-300">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Verbal Consent Captured</span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                                CONFIRMED
                            </span>
                        </div>

                        {/* Under-15 Hard Stop Alert */}
                        {stoppedHardCase && (
                            <Alert className="border-rose-500/80 bg-rose-950/50 text-rose-200 animate-in zoom-in-95 duration-200">
                                <ShieldAlert className="h-4 w-4 text-rose-400" />
                                <AlertTitle className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                                    Hard Stop Triggered — Under 15 Minor
                                </AlertTitle>
                                <AlertDescription className="text-xs mt-1 text-rose-200/90 leading-relaxed">
                                    {hardCaseDetail ||
                                        'Beneficiary stated age is under the legal minimum of 15. The interview has terminated immediately and cannot count toward programme employment totals.'}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Live Streaming Audio / Transcript Card */}
                        <Card className="bg-neutral-950/90 border-neutral-800">
                            <CardHeader className="p-2.5 pb-1 flex flex-row items-center justify-between">
                                <CardTitle className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Volume2 className="w-3 h-3 text-emerald-400" />
                                    Live Voice Stream & Transcript
                                </CardTitle>
                                {isRecording ? (
                                    <span className="text-[10px] text-rose-400 animate-pulse flex items-center gap-1 font-semibold">
                                        <Radio className="w-3 h-3 text-rose-400 animate-spin" /> Recording Mic...
                                    </span>
                                ) : isTranscribingAudio ? (
                                    <span className="text-[10px] text-amber-400 animate-pulse flex items-center gap-1">
                                        <RefreshCcw className="w-3 h-3 animate-spin" /> Groq Whisper STT...
                                    </span>
                                ) : isStreaming ? (
                                    <span className="text-[10px] text-emerald-400 animate-pulse flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Transcribing...
                                    </span>
                                ) : null}
                            </CardHeader>
                            <CardContent className="p-2.5 pt-1">
                                <div className="min-h-[75px] bg-neutral-900/80 border border-neutral-800 rounded-lg p-2.5 text-xs leading-relaxed font-sans text-neutral-200">
                                    {displayedTranscript ? (
                                        <span>
                                            {displayedTranscript}
                                            {(isStreaming || isRecording) && (
                                                <span className="inline-block w-1.5 h-3 bg-emerald-400 ml-1 animate-pulse" />
                                            )}
                                        </span>
                                    ) : (
                                        <span className="text-neutral-500 italic">
                                            Click a persona above or tap the microphone button below to record live voice...
                                        </span>
                                    )}
                                </div>

                                {displayedTranscript && (
                                    <div className="mt-2 flex items-center justify-between">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => speakText(displayedTranscript, selectedPersona === 'abel' ? 'am' : 'en')}
                                            className="h-6 text-[10px] text-neutral-400 hover:text-white px-2"
                                        >
                                            <Volume2 className="w-3 h-3 mr-1" /> Replay Voice Audio
                                        </Button>
                                        <span className="text-[10px] text-neutral-500 font-mono">
                                            {isSubmitting ? 'Groq Extraction...' : 'Deterministic Rule Engine'}
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Targeted Follow-up Question Callout ("We Don't Guess" Moment) */}
                        {followUps.length > 0 && !stoppedHardCase && (
                            <div className="p-3 bg-amber-950/40 border border-amber-500/60 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                                        <HelpCircle className="w-4 h-4 text-amber-400" />
                                        Targeted Follow-up Probe ("We Don't Guess")
                                    </div>
                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                                        Ambiguity Detected
                                    </Badge>
                                </div>

                                {followUps[0].ambiguous_quote && (
                                    <div className="text-[11px] bg-amber-950/80 border border-amber-700/40 rounded p-1.5 text-amber-200/90">
                                        <span className="text-[10px] text-amber-400/80 font-medium block">
                                            Ambiguous Trigger Evidence Quote:
                                        </span>
                                        "{followUps[0].ambiguous_quote}"
                                    </div>
                                )}

                                <p className="text-xs text-white font-medium bg-neutral-900/90 p-2 rounded-lg border border-neutral-700 flex items-center justify-between">
                                    <span>"{followUps[0].question}"</span>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => speakText(followUps[0].question, selectedPersona === 'abel' ? 'am' : 'en')}
                                        className="h-6 w-6 text-amber-400 hover:bg-neutral-800"
                                    >
                                        <Volume2 className="w-3.5 h-3.5" />
                                    </Button>
                                </p>

                                <div className="flex gap-1.5 pt-1">
                                    <input
                                        type="text"
                                        value={activeFollowUpAnswer}
                                        onChange={(e) => setActiveFollowUpAnswer(e.target.value)}
                                        placeholder={
                                            selectedPersona === 'abel'
                                                ? 'አቤል ምላሽ: 35 ሰዓት በሳምንት...'
                                                : 'Enter precise hours or duration...'
                                        }
                                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-amber-400"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => handleAnswerFollowUp(followUps[0])}
                                        className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold"
                                    >
                                        <Send className="w-3 h-3 mr-1" /> Answer
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Live Clause Badges Grid (The 7 Statutory Checks) */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 px-1">
                                <span>Statutory Clause Engine (7 Checks)</span>
                                <span className="text-[10px] text-emerald-400 font-mono">Plain PHP Engine</span>
                            </div>

                            <div className="grid grid-cols-1 gap-1.5">
                                {Object.entries(CLAUSE_DEFINITIONS).map(([key, def]) => {
                                    const verdict = verdicts[key];
                                    const status = verdict?.status || 'pending';
                                    const Icon = def.icon;

                                    return (
                                        <div
                                            key={key}
                                            className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                                                status === 'met'
                                                    ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                                                    : status === 'not_met'
                                                      ? 'border-rose-500/40 bg-rose-950/20 text-rose-200'
                                                      : status === 'unclear'
                                                        ? 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                                                        : 'border-neutral-800 bg-neutral-950/40 text-neutral-400'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`p-1.5 rounded-lg ${
                                                        status === 'met'
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : status === 'not_met'
                                                              ? 'bg-rose-500/20 text-rose-400'
                                                              : status === 'unclear'
                                                                ? 'bg-amber-500/20 text-amber-400'
                                                                : 'bg-neutral-800 text-neutral-400'
                                                    }`}
                                                >
                                                    <Icon className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                                        {def.short}
                                                        <span className="text-[9px] text-neutral-400 font-mono font-normal">
                                                            {def.sdg}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-neutral-400 truncate max-w-[200px]">
                                                        {verdict?.reason || def.label}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            <div>
                                                {status === 'met' && (
                                                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-semibold flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> MET
                                                    </Badge>
                                                )}
                                                {status === 'not_met' && (
                                                    <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px] font-semibold flex items-center gap-1">
                                                        <XCircle className="w-3 h-3 text-rose-400" /> NOT MET
                                                    </Badge>
                                                )}
                                                {status === 'unclear' && (
                                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-semibold flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3 text-amber-400" /> UNCLEAR
                                                    </Badge>
                                                )}
                                                {status === 'pending' && (
                                                    <Badge variant="outline" className="border-neutral-800 text-neutral-500 text-[10px]">
                                                        WAITING
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action / Microphone Bar */}
                    <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    onClick={toggleRecording}
                                    className={`h-11 w-11 rounded-full transition-all ${
                                        isRecording
                                            ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-4 ring-rose-900/50'
                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950'
                                    }`}
                                >
                                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs">
                                    {isRecording ? 'Click to Stop Recording' : 'Hold or Click to Speak Live Mic'}
                                </p>
                            </TooltipContent>
                        </Tooltip>

                        <Button
                            onClick={handleCompleteInterview}
                            disabled={!displayedTranscript || isSubmitting || stoppedHardCase}
                            className="flex-1 h-11 bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs rounded-xl shadow"
                        >
                            Save & Aggregate to Dashboard →
                        </Button>
                    </div>
                </div>

                {/* Stage Lens Footer Notice */}
                <div className="w-full max-w-[420px] mt-3 text-center text-[11px] text-neutral-400">
                    <span className="font-semibold text-neutral-300">Phase 3 Live Voice:</span> STT $\rightarrow$ Extraction $\rightarrow$ Rule Engine $\rightarrow$ Follow-up Probe $\rightarrow$ TTS.
                </div>
            </div>
        </>
    );
}
