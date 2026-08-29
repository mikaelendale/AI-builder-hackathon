import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Award,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    DollarSign,
    Globe,
    HelpCircle,
    Mic,
    MicOff,
    PhoneCall,
    PhoneOff,
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
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { PhoneMockupCard } from '@/components/mockups/phone-mockup-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

interface ChatTurn {
    sender: 'agent' | 'worker';
    text: string;
    audioUrl?: string | null;
    timestamp: string;
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
        lang: 'en' as const,
        type: 'selam' as const,
        tag: 'Clean (EN)',
        description: 'Clean case. English. All 7 clauses resolve met.',
        script:
            'Hello. My name is Selam Tesfaye, I am 22 years old. I was placed in a call centre in Addis Ababa 6 months ago. I work 40 hours per week, Monday through Friday, 8 hours a day. I am paid 6500 ETB monthly with direct bank deposit and pension deducted. I am free to join the workers group, there is no discrimination, no forced labour, and I started this job as an adult.',
    },
    abel: {
        name: 'Abel Kebede',
        age: 19,
        role: 'Construction Daily Worker (Adama)',
        lang: 'am' as const,
        type: 'abel' as const,
        tag: 'Unclear (AM)',
        description: "Ambiguous case. Amharic. The hours clause resolves unclear, triggering targeted follow-up.",
        script:
            'ስሜ አቤል ከበደ ይባላል። ዕድሜዬ 19 ዓመት ነው። በአዳማ ከተማ አቅራቢያ በኮንስትራክሽን ቦታ ላይ በቀን ሠራተኛነት እሠራለሁ። ክፍያዬን በጥሬ ገንዘብ ነው የማገኘው። ሥራውን የጀመርኩት ከክረምቱ በኋላ ነው፣ አምስት ወይም ሰባት ወር ሊሆን ይችላል፣ ሥራ በተገኘበት ቀን ብቻ ነው የምሠራው።',
        followUpAnswer: 'በተለመደው ሳምንት ውስጥ 35 ሰዓት እሠራለሁ፣ እና ከጀመርኩ 6 ወር ሆኖኛል።',
    },
    minor: {
        name: 'Yordanos Girma',
        age: 14,
        role: 'Packaging Assistant (Under-15 Minor)',
        lang: 'en' as const,
        type: 'synthetic' as const,
        tag: 'Minor Stop',
        description: 'Under-15 detected → interview stops immediately, flags, never counts.',
        script:
            'Hello, my name is Yordanos Girma. I am 14 years old. I work helping at the biscuit packaging workshop after school hours.',
    },
};

export default function InterviewPage({ beneficiaries, interview: initialInterview }: InterviewProps) {
    const [selectedPersona, setSelectedPersona] = useState<'selam' | 'abel' | 'minor' | 'custom'>('selam');
    const [languageMode, setLanguageMode] = useState<'en' | 'am'>('en');
    const [currentInterviewId, setCurrentInterviewId] = useState<number | null>(initialInterview?.id || null);
    const [consentGiven, setConsentGiven] = useState(true);
    const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
    const [isLiveCallActive, setIsLiveCallActive] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [liveInterimSpeech, setLiveInterimSpeech] = useState('');
    const [stoppedHardCase, setStoppedHardCase] = useState(false);
    const [hardCaseDetail, setHardCaseDetail] = useState<string | null>(null);
    const [followUps, setFollowUps] = useState<FollowUp[]>([]);
    const [audioVolumeLevel, setAudioVolumeLevel] = useState(0);
    const [showClauseDetails, setShowClauseDetails] = useState(false);
    const [phoneVariant, setPhoneVariant] = useState<'titanium' | 'purple' | 'orange' | 'white' | 'cherry'>('titanium');

    const [verdicts, setVerdicts] = useState<Record<string, ClauseVerdict>>(() => {
        const initial: Record<string, ClauseVerdict> = {};
        Object.keys(CLAUSE_DEFINITIONS).forEach((k) => {
            initial[k] = { status: 'pending', confidence: 0 };
        });
        return initial;
    });

    // === REFS to prevent stale closures in async callbacks ===
    const liveCallActiveRef = useRef(false);
    const currentInterviewIdRef = useRef<number | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const activeAudioElementRef = useRef<HTMLAudioElement | null>(null);
    const speechRecognitionRef = useRef<any>(null);
    const hasSpokenRef = useRef(false);
    const interimTextRef = useRef('');
    const languageModeRef = useRef(languageMode);
    const chatBottomRef = useRef<HTMLDivElement | null>(null);

    // Keep refs in sync with state
    useEffect(() => { languageModeRef.current = languageMode; }, [languageMode]);
    useEffect(() => { currentInterviewIdRef.current = currentInterviewId; }, [currentInterviewId]);

    // Auto-scroll chat
    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatTurns, liveInterimSpeech, isProcessing]);

    // Initial interview load
    useEffect(() => {
        if (initialInterview) {
            setCurrentInterviewId(initialInterview.id);
            if (initialInterview.beneficiary?.language === 'am') {
                setLanguageMode('am');
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
            if (initialInterview.status === 'stopped_hard_case') {
                setStoppedHardCase(true);
                setHardCaseDetail(initialInterview.hard_case_flags[0]?.detail || 'Under 15 hard stop');
            }
        }
    }, [initialInterview]);

    const csrfToken = () =>
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

    // Calculate Statutory Verification Progress
    const progressStats = useMemo(() => {
        const total = Object.keys(CLAUSE_DEFINITIONS).length;
        const met = Object.values(verdicts).filter((v) => v.status === 'met').length;
        const unclear = Object.values(verdicts).filter((v) => v.status === 'unclear').length;
        const notMet = Object.values(verdicts).filter((v) => v.status === 'not_met').length;
        const evaluated = met + unclear + notMet;
        const percent = Math.round((met / total) * 100);

        return { total, met, unclear, notMet, evaluated, percent };
    }, [verdicts]);

    const playAgentAudio = (audioUrl: string | null, fallbackText: string, onEnd?: () => void) => {
        setIsAgentSpeaking(true);
        if (activeAudioElementRef.current) {
            activeAudioElementRef.current.pause();
        }
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            activeAudioElementRef.current = audio;
            audio.onended = () => { setIsAgentSpeaking(false); onEnd?.(); };
            audio.onerror = () => { fallbackSpeechSynthesis(fallbackText, onEnd); };
            audio.play().catch(() => { fallbackSpeechSynthesis(fallbackText, onEnd); });
        } else {
            fallbackSpeechSynthesis(fallbackText, onEnd);
        }
    };

    const fallbackSpeechSynthesis = (text: string, onEnd?: () => void) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 1.0;
            u.lang = languageModeRef.current === 'am' ? 'am-ET' : 'en-US';
            u.onend = () => { setIsAgentSpeaking(false); onEnd?.(); };
            u.onerror = () => { setIsAgentSpeaking(false); onEnd?.(); };
            window.speechSynthesis.speak(u);
        } else {
            setIsAgentSpeaking(false);
            onEnd?.();
        }
    };

    const initializeInterview = async (personaKey: 'selam' | 'abel' | 'minor'): Promise<number> => {
        const p = PERSONA_SCRIPTS[personaKey];
        let target = beneficiaries.find((b) => b.persona_type === p.type);
        if (!target && beneficiaries.length > 0) target = beneficiaries[0];

        const res = await fetch(`/beneficiaries/${target?.id || 1}/interviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
            body: JSON.stringify({ consent_given: consentGiven }),
        });
        const data = await res.json();
        setCurrentInterviewId(data.interview_id);
        currentInterviewIdRef.current = data.interview_id;
        return data.interview_id;
    };

    const initializeCustomInterview = async (): Promise<number> => {
        const res = await fetch('/beneficiaries/quick-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
            body: JSON.stringify({
                name: 'Live Beneficiary',
                language: languageModeRef.current,
                phone_type: 'smartphone',
            }),
        });
        const data = await res.json();
        setCurrentInterviewId(data.interview_id);
        currentInterviewIdRef.current = data.interview_id;
        return data.interview_id;
    };

    const startListeningTurn = async (interviewId: number) => {
        if (!liveCallActiveRef.current) return;

        setIsListening(true);
        setLiveInterimSpeech('');
        hasSpokenRef.current = false;
        interimTextRef.current = '';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];

            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkAudio = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
                const avg = sum / bufferLength;
                setAudioVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));

                if (avg > 14) {
                    hasSpokenRef.current = true;
                    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = setTimeout(() => {
                        if (hasSpokenRef.current && liveCallActiveRef.current) {
                            stopAndSendTurn(interviewId);
                        }
                    }, 1000);
                }

                animFrameRef.current = requestAnimationFrame(checkAudio);
            };
            checkAudio();

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            mediaRecorder.start(200);

            const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRec) {
                try {
                    const rec = new SpeechRec();
                    rec.continuous = true;
                    rec.interimResults = true;
                    rec.lang = languageModeRef.current === 'am' ? 'am-ET' : 'en-US';

                    rec.onresult = (evt: any) => {
                        let text = '';
                        for (let i = evt.resultIndex; i < evt.results.length; i++) {
                            text += evt.results[i][0].transcript;
                        }
                        if (text) {
                            interimTextRef.current = text;
                            setLiveInterimSpeech(text);
                            hasSpokenRef.current = true;
                        }
                    };

                    rec.start();
                    speechRecognitionRef.current = rec;
                } catch (_) {}
            }
        } catch (err) {
            console.warn('[sequa-voice] Mic permission error:', err);
            setIsListening(false);
        }
    };

    const stopMicrophoneCapture = () => {
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
        if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
        if (speechRecognitionRef.current) { try { speechRecognitionRef.current.stop(); } catch (_) {} speechRecognitionRef.current = null; }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        }
        setAudioVolumeLevel(0);
        setIsListening(false);
    };

    const stopAndSendTurn = async (interviewId: number, simulatedTranscript?: string) => {
        stopMicrophoneCapture();
        setIsProcessing(true);

        const speechText = simulatedTranscript || interimTextRef.current || liveInterimSpeech;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        if (speechText) {
            setChatTurns((prev) => [...prev, { sender: 'worker', text: speechText, timestamp: 'Now' }]);
        }
        setLiveInterimSpeech('');

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'turn.webm');
            formData.append('language', languageModeRef.current);
            if (speechText) {
                formData.append('transcript', speechText);
                formData.append('interim_text', speechText);
            }

            const res = await fetch(`/interviews/${interviewId}/converse`, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken() },
                body: formData,
            });

            const data = await res.json();
            console.log('[sequa-voice] Converse response:', data);

            if (data.verdicts) {
                console.log('[sequa-verdicts] Updated verdicts:', data.verdicts);
                setVerdicts(data.verdicts);
            }
            if (data.follow_ups) {
                console.log('[sequa-followup] Follow-up probes:', data.follow_ups);
                setFollowUps(data.follow_ups);
            }
            if (data.stopped) {
                setStoppedHardCase(true);
                setHardCaseDetail(data.agent_text);
                liveCallActiveRef.current = false;
                setIsLiveCallActive(false);
            }

            const agentReply = data.agent_text || (languageModeRef.current === 'am' ? 'እናመሰግናለን።' : 'Thank you.');
            setChatTurns((prev) => [
                ...prev,
                { sender: 'agent', text: agentReply, audioUrl: data.audio_url, timestamp: 'Now' },
            ]);

            playAgentAudio(data.audio_url, agentReply, () => {
                if (liveCallActiveRef.current && !data.is_complete && !data.stopped) {
                    startListeningTurn(interviewId);
                }
            });
        } catch (err) {
            console.error('[sequa-voice] Error sending turn:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManualSend = () => {
        if (currentInterviewIdRef.current) {
            stopAndSendTurn(currentInterviewIdRef.current);
        }
    };

    const startLiveCall = async () => {
        let intId = currentInterviewIdRef.current;
        if (!intId) {
            if (selectedPersona === 'custom') {
                intId = await initializeCustomInterview();
            } else {
                intId = await initializeInterview(selectedPersona);
            }
        }

        liveCallActiveRef.current = true;
        setIsLiveCallActive(true);
        setStoppedHardCase(false);
        setHardCaseDetail(null);

        const greeting = languageModeRef.current === 'am'
            ? 'ጤና ይስጥልኝ። የሴኳ ፕሮግራም የሥራ ማረጋገጫ ረዳት ነኝ። እባክዎን ስምዎን፣ ዕድሜዎን እና የሥራ ሁኔታዎን ይንገሩኝ።'
            : 'Hello. I am the sequa programme verification assistant. Please state your name, age, and employment details.';

        setChatTurns((prev) => [...prev, { sender: 'agent', text: greeting, timestamp: 'Now' }]);

        try {
            const res = await fetch('/api/audio/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                body: JSON.stringify({ text: greeting, language: languageModeRef.current, voice_id: 'am-hamen' }),
            });
            const data = await res.json();
            playAgentAudio(data.audio_url, greeting, () => {
                if (liveCallActiveRef.current) startListeningTurn(intId!);
            });
        } catch (_) {
            fallbackSpeechSynthesis(greeting, () => {
                if (liveCallActiveRef.current) startListeningTurn(intId!);
            });
        }
    };

    const endLiveCall = () => {
        liveCallActiveRef.current = false;
        setIsLiveCallActive(false);
        setIsListening(false);
        setIsAgentSpeaking(false);
        if (activeAudioElementRef.current) activeAudioElementRef.current.pause();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        stopMicrophoneCapture();
    };

    const handleLanguageChange = (lang: 'en' | 'am') => {
        setLanguageMode(lang);
        languageModeRef.current = lang;
    };

    const handleTriggerPersonaDemo = async (personaKey: 'selam' | 'abel' | 'minor') => {
        endLiveCall();
        setSelectedPersona(personaKey);
        const p = PERSONA_SCRIPTS[personaKey];
        setLanguageMode(p.lang);
        languageModeRef.current = p.lang;

        const reset: Record<string, ClauseVerdict> = {};
        Object.keys(CLAUSE_DEFINITIONS).forEach((k) => { reset[k] = { status: 'pending', confidence: 0 }; });
        setVerdicts(reset);
        setFollowUps([]);

        const intId = await initializeInterview(personaKey);
        setChatTurns([{ sender: 'worker', text: p.script, timestamp: 'Now' }]);

        setIsProcessing(true);
        try {
            const res = await fetch(`/interviews/${intId}/converse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                body: JSON.stringify({ transcript: p.script, language: p.lang }),
            });
            const data = await res.json();
            console.log('[sequa-persona] Script evaluated:', data);

            if (data.verdicts) setVerdicts(data.verdicts);
            if (data.follow_ups) setFollowUps(data.follow_ups);
            if (data.stopped) { setStoppedHardCase(true); setHardCaseDetail(data.agent_text); }

            setChatTurns((prev) => [
                ...prev,
                { sender: 'agent', text: data.agent_text, audioUrl: data.audio_url, timestamp: 'Now' },
            ]);
            playAgentAudio(data.audio_url, data.agent_text);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSendFollowUpAnswer = async (answerText: string) => {
        if (!currentInterviewIdRef.current) return;
        setIsProcessing(true);
        setChatTurns((prev) => [...prev, { sender: 'worker', text: answerText, timestamp: 'Now' }]);

        try {
            const res = await fetch(`/interviews/${currentInterviewIdRef.current}/converse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                body: JSON.stringify({ transcript: answerText, language: languageModeRef.current }),
            });
            const data = await res.json();
            console.log('[sequa-followup-answer] Response:', data);

            if (data.verdicts) setVerdicts(data.verdicts);
            if (data.follow_ups) setFollowUps(data.follow_ups);

            setChatTurns((prev) => [
                ...prev,
                { sender: 'agent', text: data.agent_text, audioUrl: data.audio_url, timestamp: 'Now' },
            ]);
            playAgentAudio(data.audio_url, data.agent_text);
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleStartCustomCall = async () => {
        endLiveCall();
        setSelectedPersona('custom');

        const reset: Record<string, ClauseVerdict> = {};
        Object.keys(CLAUSE_DEFINITIONS).forEach((k) => { reset[k] = { status: 'pending', confidence: 0 }; });
        setVerdicts(reset);
        setFollowUps([]);
        setStoppedHardCase(false);
        setHardCaseDetail(null);
        setChatTurns([]);

        setCurrentInterviewId(null);
        currentInterviewIdRef.current = null;
        await startLiveCall();
    };

    const handleCompleteInterview = async () => {
        if (!currentInterviewIdRef.current) return;
        try {
            await fetch(`/interviews/${currentInterviewIdRef.current}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                body: JSON.stringify({
                    job_position: selectedPersona === 'selam' ? 'Call Centre Agent'
                        : selectedPersona === 'abel' ? 'Construction Daily Labourer'
                        : 'General Beneficiary',
                }),
            });
            router.visit('/dashboard');
        } catch (err) { console.error(err); }
    };

    return (
        <>
            <Head title="Beneficiary Voice Verification — sequa Audit" />

            <div className="min-h-screen bg-background text-foreground py-2 sm:py-4 px-2 flex flex-col items-center justify-start transition-colors duration-200">
                <div className="w-full max-w-[380px] mb-2 flex items-center justify-between px-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="font-semibold tracking-tight text-[11px] text-foreground">sequa Verification Engine</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 p-0.5 bg-muted rounded-full border border-border">
                            {(['titanium', 'purple', 'orange', 'white', 'cherry'] as const).map((v) => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setPhoneVariant(v)}
                                    title={`Finish: ${v}`}
                                    className={`w-3 h-3 rounded-full transition-transform ${
                                        phoneVariant === v ? 'ring-2 ring-primary scale-110' : 'opacity-60 hover:opacity-100'
                                    } ${
                                        v === 'titanium' ? 'bg-[#3b3a39]'
                                            : v === 'purple' ? 'bg-[#4a4254]'
                                            : v === 'orange' ? 'bg-[#d4845a]'
                                            : v === 'white' ? 'bg-[#e4e4e8]'
                                            : 'bg-[#d49aa8]'
                                    }`}
                                />
                            ))}
                        </div>

                        <ThemeToggle />
                    </div>
                </div>

                <PhoneMockupCard variant={phoneVariant} showDynamicIsland={true} className="w-full max-w-[380px] h-[750px] max-h-[calc(100vh-45px)] shadow-xl">
                    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden relative select-none">
                        
                        <div className="w-full h-10 pt-2.5 px-6 shrink-0 flex items-center justify-between text-[11px] font-semibold text-muted-foreground z-20 pointer-events-none select-none">
                            <span>9:41</span>
                            <div className="flex items-center gap-1.5 text-[10px]">
                                <span>5G</span>
                                <span>100%</span>
                            </div>
                        </div>

                        <div className="px-3.5 py-2 shrink-0 bg-card/90 backdrop-blur-sm border-b border-border flex items-center justify-between gap-2 z-10">
                            <div>
                                <div className="text-xs font-bold tracking-tight text-foreground">
                                    Voice Audit
                                </div>
                                <div className="text-[9px] text-muted-foreground">
                                    Direct Worker Verification
                                </div>
                            </div>

                            <div className="flex p-0.5 rounded-lg bg-muted border border-border">
                                <button
                                    type="button"
                                    onClick={() => handleLanguageChange('en')}
                                    className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                                        languageMode === 'en'
                                            ? 'bg-background text-foreground shadow-xs font-bold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    EN
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleLanguageChange('am')}
                                    className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                                        languageMode === 'am'
                                            ? 'bg-background text-foreground shadow-xs font-bold'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    አማርኛ
                                </button>
                            </div>

                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => router.visit('/dashboard')}
                                className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                            >
                                Dashboard
                            </Button>
                        </div>

                        <div className="px-3.5 py-1.5 shrink-0 bg-muted/30 border-b border-border flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="font-medium text-muted-foreground">
                                    Statutory Criteria
                                </span>
                                <span className="font-mono font-semibold text-foreground">
                                    {progressStats.met}/{progressStats.total} Verified ({progressStats.percent}%)
                                </span>
                            </div>

                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                                <div
                                    className="bg-emerald-500 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${(progressStats.met / progressStats.total) * 100}%` }}
                                />
                                <div
                                    className="bg-amber-500 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${(progressStats.unclear / progressStats.total) * 100}%` }}
                                />
                                <div
                                    className="bg-destructive h-full transition-all duration-300 ease-out"
                                    style={{ width: `${(progressStats.notMet / progressStats.total) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="px-3 py-1.5 shrink-0 bg-card/60 border-b border-border">
                            <div className="grid grid-cols-4 gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleTriggerPersonaDemo('selam')}
                                    className={`py-1 px-1 rounded-md text-center border text-[10px] transition-all ${
                                        selectedPersona === 'selam'
                                            ? 'border-border bg-muted text-foreground font-bold shadow-xs'
                                            : 'border-transparent bg-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <div className="truncate font-semibold">Selam</div>
                                    <div className="text-[8px] opacity-70">Clean EN</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleTriggerPersonaDemo('abel')}
                                    className={`py-1 px-1 rounded-md text-center border text-[10px] transition-all ${
                                        selectedPersona === 'abel'
                                            ? 'border-border bg-muted text-foreground font-bold shadow-xs'
                                            : 'border-transparent bg-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <div className="truncate font-semibold">Abel</div>
                                    <div className="text-[8px] opacity-70">Unclear AM</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleTriggerPersonaDemo('minor')}
                                    className={`py-1 px-1 rounded-md text-center border text-[10px] transition-all ${
                                        selectedPersona === 'minor'
                                            ? 'border-border bg-muted text-foreground font-bold shadow-xs'
                                            : 'border-transparent bg-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <div className="truncate font-semibold">Minor</div>
                                    <div className="text-[8px] opacity-70">Under-15</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleStartCustomCall()}
                                    className={`py-1 px-1 rounded-md text-center border text-[10px] transition-all ${
                                        selectedPersona === 'custom'
                                            ? 'border-border bg-muted text-foreground font-bold shadow-xs'
                                            : 'border-transparent bg-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <div className="truncate font-semibold">You</div>
                                    <div className="text-[8px] opacity-70">Live Mic</div>
                                </button>
                            </div>
                        </div>

                        <div className="py-2 px-3 shrink-0 flex items-center justify-between bg-card/40 border-b border-border">
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={isListening ? handleManualSend : startLiveCall}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                        isListening
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : isAgentSpeaking
                                              ? 'bg-primary text-primary-foreground'
                                              : isProcessing
                                                ? 'bg-muted text-muted-foreground'
                                                : 'bg-muted hover:bg-muted/80 text-foreground'
                                    }`}
                                >
                                    {isProcessing ? (
                                        <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                                    ) : isAgentSpeaking ? (
                                        <Volume2 className="w-3.5 h-3.5" />
                                    ) : isListening ? (
                                        <Mic className="w-3.5 h-3.5" />
                                    ) : (
                                        <PhoneCall className="w-3.5 h-3.5" />
                                    )}
                                </button>

                                <div>
                                    <div className="text-[11px] font-semibold text-foreground">
                                        {isListening
                                            ? 'Listening for worker speech...'
                                            : isAgentSpeaking
                                              ? 'AI Auditor speaking...'
                                              : isProcessing
                                                ? 'Evaluating statutory clauses...'
                                                : isLiveCallActive
                                                  ? 'Call Active'
                                                  : 'Ready to verify'}
                                    </div>
                                    <div className="text-[9px] text-muted-foreground">
                                        {languageMode === 'am' ? 'Addis AI Voice (Amharic)' : 'OpenAI Voice Loop (English)'}
                                    </div>
                                </div>
                            </div>

                            {isListening && (
                                <div className="flex items-center gap-0.5 h-3">
                                    {[1, 2, 3, 4, 5].map((b) => (
                                        <div
                                            key={b}
                                            className="w-0.5 bg-emerald-500 rounded-full transition-all duration-75"
                                            style={{
                                                height: `${Math.max(3, (audioVolumeLevel * (b % 3 + 1)) / 4)}px`,
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 p-3 space-y-2.5 overflow-y-auto min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            
                            {stoppedHardCase && (
                                <Alert className="border-destructive/30 bg-destructive/10 text-destructive p-2.5 rounded-lg">
                                    <AlertTitle className="text-xs font-bold">
                                        Hard Stop Triggered — Under 15 Minor
                                    </AlertTitle>
                                    <AlertDescription className="text-[10px] mt-0.5">
                                        {hardCaseDetail || 'Beneficiary is under legal minimum age of 15. The interview terminated immediately.'}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                {chatTurns.length === 0 && !isLiveCallActive && (
                                    <div className="text-center py-6 text-muted-foreground text-xs space-y-1.5">
                                        <p className="font-semibold text-foreground">Ready for Audit</p>
                                        <p className="text-[11px]">Select a persona above or tap start to begin.</p>
                                    </div>
                                )}

                                {chatTurns.map((turn, i) => (
                                    <div
                                        key={i}
                                        className={`flex flex-col ${turn.sender === 'agent' ? 'items-start' : 'items-end'}`}
                                    >
                                        <div className="text-[8px] text-muted-foreground mb-0.5 px-1 font-semibold uppercase tracking-wider">
                                            {turn.sender === 'agent' ? 'AI Auditor (sequa)' : 'Beneficiary Worker'}
                                        </div>
                                        <div
                                            className={`p-2.5 rounded-xl max-w-[88%] text-xs leading-relaxed ${
                                                turn.sender === 'agent'
                                                    ? 'bg-card text-card-foreground border border-border shadow-xs'
                                                    : 'bg-primary text-primary-foreground shadow-xs'
                                            }`}
                                        >
                                            <p>{turn.text}</p>
                                            {turn.audioUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => playAgentAudio(turn.audioUrl!, turn.text)}
                                                    className="mt-1 text-[9px] flex items-center gap-1 opacity-80 hover:opacity-100 underline text-muted-foreground hover:text-foreground"
                                                >
                                                    <Volume2 className="w-3 h-3" /> Replay Voice
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {followUps.length > 0 && selectedPersona === 'abel' && (
                                    <div className="pt-1 flex justify-center">
                                        <Button
                                            size="sm"
                                            onClick={() => handleSendFollowUpAnswer(PERSONA_SCRIPTS.abel.followUpAnswer)}
                                            className="h-8 text-xs bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg flex items-center gap-1.5 shadow-xs"
                                        >
                                            <span>💬</span> Clarify Abel's Hours (35 hrs/wk)
                                        </Button>
                                    </div>
                                )}

                                {liveInterimSpeech && (
                                    <div className="flex flex-col items-end">
                                        <div className="text-[8px] text-muted-foreground mb-0.5 px-1 font-semibold uppercase">
                                            Speaking...
                                        </div>
                                        <div className="p-2.5 rounded-xl max-w-[88%] text-xs bg-primary/80 text-primary-foreground border border-primary/40">
                                            {liveInterimSpeech}
                                        </div>
                                    </div>
                                )}

                                {isProcessing && (
                                    <div className="flex items-center gap-2 p-2 bg-muted/60 rounded-lg text-[11px] text-muted-foreground border border-border">
                                        <RefreshCcw className="w-3 h-3 animate-spin text-foreground" />
                                        <span>
                                            {languageMode === 'am'
                                                ? 'ማረጋገጫዎች እየተገመገሙ ነው...'
                                                : 'Assessing statutory clauses...'}
                                        </span>
                                    </div>
                                )}

                                <div ref={chatBottomRef} />
                            </div>

                            <div className="pt-2 border-t border-border space-y-1.5">
                                <div
                                    onClick={() => setShowClauseDetails(!showClauseDetails)}
                                    className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground py-0.5"
                                >
                                    <span>7 Statutory Clauses ({progressStats.met}/{progressStats.total})</span>
                                    <span className="flex items-center gap-0.5 text-foreground">
                                        {showClauseDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-1">
                                    {Object.entries(CLAUSE_DEFINITIONS).map(([key, def]) => {
                                        const verdict = verdicts[key];
                                        const status = verdict?.status || 'pending';

                                        return (
                                            <div
                                                key={key}
                                                className="p-1.5 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between text-xs transition-colors hover:bg-muted/30"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-medium text-[11px] text-foreground">{def.short}</span>
                                                    {showClauseDetails && verdict?.evidence_quote && (
                                                        <span className="text-[9px] text-muted-foreground line-clamp-1">
                                                            "{verdict.evidence_quote}"
                                                        </span>
                                                    )}
                                                </div>
                                                <span
                                                    className={`text-[9px] font-mono uppercase font-semibold py-0.5 px-1.5 rounded-full border ${
                                                        status === 'met'
                                                            ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                                            : status === 'not_met'
                                                              ? 'border-destructive/30 text-destructive bg-destructive/10'
                                                              : status === 'unclear'
                                                                ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                                                : 'border-border text-muted-foreground bg-muted'
                                                    }`}
                                                >
                                                    {status}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 pt-2.5 pb-8 px-3.5 bg-card/98 backdrop-blur-md border-t border-border flex items-center justify-between gap-2 z-20 shadow-lg">
                            {isLiveCallActive ? (
                                <div className="flex items-center gap-2 w-full">
                                    {isListening && (
                                        <Button
                                            onClick={handleManualSend}
                                            className="flex-1 h-10 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                                        >
                                            <Send className="w-3.5 h-3.5" /> Tap to Send
                                        </Button>
                                    )}
                                    <Button
                                        onClick={endLiveCall}
                                        variant="destructive"
                                        className={`${isListening ? 'w-10 px-0' : 'flex-1'} h-10 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5`}
                                    >
                                        <PhoneOff className="w-4 h-4" />
                                        {!isListening && 'End Call'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 w-full">
                                    <Button
                                        onClick={startLiveCall}
                                        className="flex-1 h-10 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                                    >
                                        <PhoneCall className="w-3.5 h-3.5" /> Start Live Voice Call
                                    </Button>
                                    <Button
                                        onClick={handleCompleteInterview}
                                        disabled={stoppedHardCase}
                                        variant="outline"
                                        className="h-10 px-3.5 text-xs font-semibold rounded-xl border-border bg-card hover:bg-muted text-foreground"
                                    >
                                        Save →
                                    </Button>
                                </div>
                            )}
                        </div>

                    </div>
                </PhoneMockupCard>

                {/* Subtitle */}
                <div className="w-full max-w-[380px] mt-2 text-center text-[10px] text-muted-foreground">
                    Addis AI Voice (Amharic) • OpenAI (English) • Rule Engine Persistence
                </div>
            </div>
        </>
    );
}
