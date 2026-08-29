import { Head, router } from '@inertiajs/react';
import {
    ChevronLeft,
    Globe,
    Hash,
    Mic,
    MicOff,
    PhoneCall,
    PhoneForwarded,
    PhoneOff,
    Radio,
    RefreshCcw,
    Send,
    ShieldCheck,
    Sparkles,
    Volume2,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FeaturePhoneSimulatorProps {
    interview?: {
        id: number;
        beneficiary_id: number;
        status: string;
        beneficiary: {
            id: number;
            name: string;
            language: string;
        };
        clause_assessments?: Array<{
            clause_key: string;
            status: 'met' | 'not_met' | 'unclear';
            confidence: number;
            evidence_quote: string | null;
        }>;
    } | null;
}

const KEYPAD_KEYS = [
    { num: '1', sub: '.,', f1: 697, f2: 1209 },
    { num: '2', sub: 'ABC', f1: 697, f2: 1336 },
    { num: '3', sub: 'DEF', f1: 697, f2: 1477 },
    { num: '4', sub: 'GHI', f1: 770, f2: 1209 },
    { num: '5', sub: 'JKL', f1: 770, f2: 1336 },
    { num: '6', sub: 'MNO', f1: 770, f2: 1477 },
    { num: '7', sub: 'PQRS', f1: 852, f2: 1209 },
    { num: '8', sub: 'TUV', f1: 852, f2: 1336 },
    { num: '9', sub: 'WXYZ', f1: 852, f2: 1477 },
    { num: '*', sub: ' ', f1: 941, f2: 1209 },
    { num: '0', sub: '+', f1: 941, f2: 1336 },
    { num: '#', sub: ' ', f1: 941, f2: 1477 },
];

const TRANSLITERATION_MAP: Record<string, { fidel: string; latin: string }> = {
    welcome: {
        fidel: 'እንኳን ወደ ሴኳ የሥራ ማረጋገጫ መስመር በደህና መጡ።',
        latin: 'Enkwan wede sequa maregagecha mesmer bedehena metu.',
    },
    menu: {
        fidel: '1=ማንነት 2=ሰዓት 3=ደሞዝ 0=ድምፅ',
        latin: '1=ID 2=Hours 3=Wage 0=Voice',
    },
    identity: {
        fidel: 'አቤል ከበደ: 19 ዓመት (ኮንስትራክሽን)',
        latin: 'Abel Kebede: 19 yrs (Adama)',
    },
    hours_probe: {
        fidel: 'በሳምንት ስንት ሰዓት ይሠራሉ?',
        latin: 'Samint wist sint se\'at yeseralu?',
    },
    wage_report: {
        fidel: 'ክፍያ: በጥሬ ገንዘብ ይከፈላል',
        latin: 'Kifya: Betire genzeb yikefelal',
    },
    confirmed: {
        fidel: 'ሁሉም መረጃዎች በተሳካ ሁኔታ ተመዝግበዋል',
        latin: 'Hulum masrejawoch temezgbiwal',
    },
    listening: {
        fidel: 'እየሰማን ነው... ይናገሩ',
        latin: 'Eyeseman new... Yinageru',
    },
};

export default function FeaturePhoneSimulator({ interview: initialInterview }: FeaturePhoneSimulatorProps) {
    const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
    const [lcdLines, setLcdLines] = useState<string[]>([
        'ITEL / TECNO 2160',
        '2G ETHIO TELECOM',
        'Press CALL to connect',
    ]);
    const [inputBuffer, setInputBuffer] = useState('');
    const [scriptMode, setScriptMode] = useState<'fidel' | 'latin'>('fidel');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [audioVolumeLevel, setAudioVolumeLevel] = useState(0);
    const [callDuration, setCallDuration] = useState(0);
    const [activeInterviewId, setActiveInterviewId] = useState<number | null>(initialInterview?.id || null);

    const [verdicts, setVerdicts] = useState<Record<string, string>>({
        age_15_plus: 'pending',
        hours_threshold: 'pending',
        min_wage: 'pending',
        no_child_labor: 'pending',
    });

    const activeAudioElementRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const callTimerRef = useRef<NodeJS.Timeout | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const speechRecRef = useRef<any>(null);
    const interimTextRef = useRef('');

    const csrfToken = () =>
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

    // Initialize call timer
    useEffect(() => {
        if (callState === 'connected') {
            setCallDuration(0);
            callTimerRef.current = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        } else {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
        }
        return () => {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
        };
    }, [callState]);

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // ─── Authentic DTMF Dual-Tone Generator ───────────────────
    const playDtmfTone = (freq1: number, freq2: number, durationMs = 120) => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.value = freq1;
            osc2.frequency.value = freq2;

            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start();
            osc2.start();
            osc1.stop(ctx.currentTime + durationMs / 1000);
            osc2.stop(ctx.currentTime + durationMs / 1000);

            setTimeout(() => {
                ctx.close().catch(() => {});
            }, durationMs + 50);
        } catch (_) {}
    };

    // ─── Addis AI TTS Voice Output ────────────────────────────
    const speakPrompt = async (text: string, onEnd?: () => void) => {
        setIsSpeaking(true);

        if (activeAudioElementRef.current) {
            activeAudioElementRef.current.pause();
        }

        try {
            const res = await fetch('/api/audio/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                body: JSON.stringify({
                    text,
                    language: 'am',
                    voice_id: 'am-hamen',
                }),
            });
            const data = await res.json();

            if (data.audio_url) {
                const audio = new Audio(data.audio_url);
                activeAudioElementRef.current = audio;
                audio.onended = () => {
                    setIsSpeaking(false);
                    onEnd?.();
                };
                audio.onerror = () => fallbackSpeechSynthesis(text, onEnd);
                audio.play().catch(() => fallbackSpeechSynthesis(text, onEnd));
                return;
            }
        } catch (_) {}

        fallbackSpeechSynthesis(text, onEnd);
    };

    const fallbackSpeechSynthesis = (text: string, onEnd?: () => void) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            utterance.lang = 'am-ET';
            utterance.onend = () => {
                setIsSpeaking(false);
                onEnd?.();
            };
            utterance.onerror = () => {
                setIsSpeaking(false);
                onEnd?.();
            };
            window.speechSynthesis.speak(utterance);
        } else {
            setIsSpeaking(false);
            onEnd?.();
        }
    };

    // ─── Microphone Capture & STT ─────────────────────────────
    const startMicListening = async () => {
        if (callState !== 'connected') return;

        setIsListening(true);
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

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateVisualizer = () => {
                if (!analyser) return;
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
                const avg = sum / bufferLength;
                setAudioVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));

                if (avg > 12) {
                    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = setTimeout(() => {
                        stopAndSendTurn();
                    }, 1100);
                }

                animFrameRef.current = requestAnimationFrame(updateVisualizer);
            };
            updateVisualizer();

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            mediaRecorder.start(200);

            // Web Speech API for Amharic live speech text
            const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRec) {
                try {
                    const rec = new SpeechRec();
                    rec.continuous = true;
                    rec.interimResults = true;
                    rec.lang = 'am-ET';
                    rec.onresult = (evt: any) => {
                        let text = '';
                        for (let i = evt.resultIndex; i < evt.results.length; i++) {
                            text += evt.results[i][0].transcript;
                        }
                        if (text) interimTextRef.current = text;
                    };
                    rec.start();
                    speechRecRef.current = rec;
                } catch (_) {}
            }
        } catch (err) {
            console.warn('Microphone error:', err);
            setIsListening(false);
        }
    };

    const stopMicCapture = () => {
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
        if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
        if (speechRecRef.current) { try { speechRecRef.current.stop(); } catch (_) {} speechRecRef.current = null; }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        }
        setAudioVolumeLevel(0);
        setIsListening(false);
    };

    const stopAndSendTurn = async (simulatedTranscript?: string) => {
        stopMicCapture();
        setIsProcessing(true);

        const speechText = simulatedTranscript || interimTextRef.current;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        setLcdLines([
            '2G ETHIO TELECOM',
            scriptMode === 'fidel' ? 'መረጃው እየተገመገመ ነው...' : 'Evaluating IVR turn...',
            'Processing...',
        ]);

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'speech.webm');
            formData.append('language', 'am');
            if (speechText) {
                formData.append('transcript', speechText);
                formData.append('interim_text', speechText);
            }

            let intId = activeInterviewId;
            if (!intId) {
                const initRes = await fetch('/beneficiaries/quick-create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                    body: JSON.stringify({ name: 'Abel Kebede', language: 'am', phone_type: 'feature_phone' }),
                });
                const initData = await initRes.json();
                intId = initData.interview_id;
                setActiveInterviewId(intId);
            }

            const res = await fetch(`/interviews/${intId}/converse`, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken() },
                body: formData,
            });

            const data = await res.json();

            if (data.verdicts) {
                const updated: Record<string, string> = {};
                Object.keys(data.verdicts).forEach((k) => {
                    updated[k] = data.verdicts[k].status;
                });
                setVerdicts(updated);
            }

            const reply = data.agent_text || 'መረጃው ተመዝግቧል።';
            setLcdLines([
                `CONNECTED ${formatDuration(callDuration)}`,
                scriptMode === 'fidel' ? reply.slice(0, 30) : 'Response processed #',
                scriptMode === 'fidel' ? '1=ስም 2=ሰዓት 3=ክፍያ' : '1=Name 2=Hours 3=Wage',
            ]);

            speakPrompt(reply, () => {
                if (callState === 'connected' && !data.is_complete) {
                    startMicListening();
                }
            });
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    // ─── Call Controls ────────────────────────────────────────
    const handleStartCall = () => {
        setCallState('calling');
        setLcdLines(['Calling...', 'sequa Verification IVR', 'Connecting 8421#']);

        setTimeout(() => {
            setCallState('connected');
            const welcomeText = scriptMode === 'fidel' ? TRANSLITERATION_MAP.welcome.fidel : TRANSLITERATION_MAP.welcome.latin;
            const menuText = scriptMode === 'fidel' ? TRANSLITERATION_MAP.menu.fidel : TRANSLITERATION_MAP.menu.latin;

            setLcdLines([
                'CONNECTED 00:01',
                welcomeText.slice(0, 32),
                menuText,
            ]);

            speakPrompt('እንኳን ወደ ሴኳ የሥራ ማረጋገጫ መስመር በደህና መጡ። ለማንነት ማረጋገጫ አንድን፣ ለሥራ ሰዓት ሁለትን ይጫኑ።', () => {
                startMicListening();
            });
        }, 1200);
    };

    const handleEndCall = () => {
        stopMicCapture();
        if (activeAudioElementRef.current) activeAudioElementRef.current.pause();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();

        setCallState('ended');
        setLcdLines(['CALL ENDED', `Duration ${formatDuration(callDuration)}`, 'Record Synced #8421']);
        setTimeout(() => {
            setCallState('idle');
            setLcdLines(['ITEL / TECNO 2160', '2G ETHIO TELECOM', 'Press CALL to connect']);
        }, 2200);
    };

    // ─── Keypad Key Press Handler ─────────────────────────────
    const handleKeyPress = (k: (typeof KEYPAD_KEYS)[number]) => {
        playDtmfTone(k.f1, k.f2);

        if (callState !== 'connected') {
            setInputBuffer((prev) => (prev + k.num).slice(-8));
            return;
        }

        setInputBuffer((prev) => (prev + k.num).slice(-6));

        if (k.num === '1') {
            const txt = scriptMode === 'fidel' ? TRANSLITERATION_MAP.identity.fidel : TRANSLITERATION_MAP.identity.latin;
            setLcdLines(['[1] BENEFICIARY ID', txt, 'Status: VERIFIED 19 YRS']);
            speakPrompt('አቤል ከበደ፣ 19 ዓመት፣ በአዳማ ከተማ ኮንስትራክሽን። የዕድሜ መስፈርቱ ተረጋግጧል።');
            setVerdicts((prev) => ({ ...prev, age_15_plus: 'met' }));
        } else if (k.num === '2') {
            const txt = scriptMode === 'fidel' ? TRANSLITERATION_MAP.hours_probe.fidel : TRANSLITERATION_MAP.hours_probe.latin;
            setLcdLines(['[2] HOURS PROBE', txt, 'Press digits + #']);
            speakPrompt('በተለመደው ሳምንት ውስጥ ስንት ሰዓት ይሠራሉ?');
            setVerdicts((prev) => ({ ...prev, hours_threshold: 'unclear' }));
        } else if (k.num === '3') {
            const txt = scriptMode === 'fidel' ? TRANSLITERATION_MAP.wage_report.fidel : TRANSLITERATION_MAP.wage_report.latin;
            setLcdLines(['[3] WAGE REPORT', txt, 'Payment: Daily Cash']);
            speakPrompt('ክፍያ በጥሬ ገንዘብ በቀን ይከፈላል።');
            setVerdicts((prev) => ({ ...prev, min_wage: 'unclear' }));
        } else if (k.num === '0') {
            setLcdLines(['[0] VOICE MODE', scriptMode === 'fidel' ? 'ድምፅዎን ይናገሩ...' : 'Speak now into mic...', 'Recording turn...']);
            speakPrompt('እባክዎን የሥራ ሁኔታዎን በድምፅ ይናገሩ።', () => {
                startMicListening();
            });
        } else if (k.num === '*') {
            speakPrompt('1 ለማንነት፣ 2 ለሥራ ሰዓት፣ 3 ለክፍያ ሁኔታ፣ 0 በድምፅ ለመነጋገር።');
        } else if (k.num === '#') {
            setLcdLines(['INPUT SUBMITTED', `KeyBuffer: ${inputBuffer || k.num}`, 'Saved to Sheet']);
            setInputBuffer('');
        }
    };

    // Fast Abel Spoken Script Simulation
    const handleSimulateAbelVoice = () => {
        if (callState !== 'connected') {
            handleStartCall();
            setTimeout(() => {
                stopAndSendTurn(
                    'ስሜ አቤል ከበደ ይባላል። ዕድሜዬ 19 ዓመት ነው። በአዳማ ከተማ አቅራቢያ በኮንስትራክሽን ቦታ ላይ በቀን ሠራተኛነት እሠራለሁ። ክፍያዬን በጥሬ ገንዘብ ነው የማገኘው።'
                );
            }, 1800);
        } else {
            stopAndSendTurn(
                'ስሜ አቤል ከበደ ይባላል። ዕድሜዬ 19 ዓመት ነው። በአዳማ ከተማ አቅራቢያ በኮንስትራክሽን ቦታ ላይ በቀን ሠራተኛነት እሠራለሁ። ክፍያዬን በጥሬ ገንዘብ ነው የማገኘው።'
            );
        }
    };

    return (
        <>
            <Head title="Feature Phone IVR Voice Simulator — Addis AI Amharic TTS & STT" />

            <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center p-2 sm:p-4 transition-colors duration-200">
                {/* Top Banner Navigation */}
                <div className="w-full max-w-sm mb-2 flex items-center justify-between">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.visit('/interview')}
                        className="h-8 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Smartphone View
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setScriptMode((m) => (m === 'fidel' ? 'latin' : 'fidel'))}
                            className="h-8 text-xs font-mono border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                        >
                            <Globe className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            {scriptMode === 'fidel' ? 'ፊደል (Ge\'ez)' : 'Latin Script'}
                        </Button>
                        <ThemeToggle />
                    </div>
                </div>

                {/* Quick Simulation Shortcuts Bar */}
                <div className="w-full max-w-sm mb-3 flex items-center justify-between gap-1.5 p-2 rounded-xl bg-card border border-border shadow-xs text-xs">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Demo:</span>
                    <button
                        type="button"
                        onClick={handleSimulateAbelVoice}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium text-[11px] truncate hover:bg-emerald-500/20 transition-colors"
                    >
                        <Volume2 className="w-3 h-3 inline mr-1" /> Abel Spoken Voice (AM)
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (callState !== 'connected') handleStartCall();
                            else if (!isListening) startMicListening();
                            else stopAndSendTurn();
                        }}
                        className="py-1.5 px-2.5 rounded-lg bg-muted text-foreground border border-border font-medium text-[11px] hover:bg-muted/80 flex items-center gap-1 transition-colors"
                    >
                        <Mic className="w-3 h-3" /> {isListening ? 'Send Voice' : 'Your Mic'}
                    </button>
                </div>

                {/* Feature Phone Casing (Itel / Nokia / Tecno Style) */}
                <div className="w-[310px] bg-neutral-800 dark:bg-neutral-900 border-4 border-neutral-700 rounded-[2.5rem] p-4 shadow-2xl flex flex-col items-center relative text-neutral-100">
                    {/* Earpiece Speaker */}
                    <div className="w-16 h-1.5 bg-neutral-950 rounded-full mb-3 shadow-inner"></div>

                    {/* Brand Label */}
                    <div className="text-[10px] tracking-widest text-neutral-400 font-bold mb-2 uppercase flex items-center justify-between w-full px-2">
                        <span>sequa • IVR 2G</span>
                        <span className="text-[8px] font-mono text-emerald-400">ADDIS AI VOICE</span>
                    </div>

                    {/* Monochrome LCD Screen */}
                    <div className="w-full h-36 bg-[#4c6340] text-[#13240e] border-4 border-neutral-950 rounded-xl p-2.5 font-mono text-xs flex flex-col justify-between shadow-inner relative overflow-hidden">
                        {/* Status bar */}
                        <div className="flex items-center justify-between text-[10px] font-bold border-b border-[#3b4e31] pb-1">
                            <span className="flex items-center gap-1">
                                <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-950" /> 2G ETH
                            </span>
                            <span>{callState === 'connected' ? `CALL ${formatDuration(callDuration)}` : 'IDLE'}</span>
                            <span className="flex items-center gap-0.5">
                                {[1, 2, 3, 4].map((bar) => (
                                    <span
                                        key={bar}
                                        className="w-1 bg-[#13240e] rounded-xs"
                                        style={{ height: `${bar * 2 + 2}px` }}
                                    />
                                ))}
                            </span>
                        </div>

                        {/* LCD Main Text Lines */}
                        <div className="space-y-1 my-auto">
                            {lcdLines.map((line, idx) => (
                                <div key={idx} className="truncate font-semibold text-[11px] leading-tight">
                                    {line}
                                </div>
                            ))}
                        </div>

                        {/* LCD Bottom Input & Audio Status */}
                        <div className="flex items-center justify-between text-[10px] border-t border-[#3b4e31] pt-0.5">
                            <span>Key: {inputBuffer || '_'}</span>
                            {isListening ? (
                                <span className="animate-pulse font-bold text-red-950 flex items-center gap-0.5">
                                    ● MIC LIVE ({audioVolumeLevel}%)
                                </span>
                            ) : isSpeaking ? (
                                <span className="animate-pulse font-bold flex items-center gap-0.5">
                                    <Volume2 className="w-3 h-3" /> ADDIS AI
                                </span>
                            ) : isProcessing ? (
                                <span className="animate-spin font-bold">...AI...</span>
                            ) : (
                                <span>READY</span>
                            )}
                        </div>
                    </div>

                    {/* Navigation D-Pad & Action Buttons */}
                    <div className="w-full grid grid-cols-3 gap-2 mt-4 px-1">
                        <button
                            type="button"
                            onClick={handleStartCall}
                            disabled={callState === 'connected' || callState === 'calling'}
                            className="h-10 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center justify-center shadow transition-all disabled:opacity-50"
                        >
                            <PhoneCall className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (isListening) stopAndSendTurn();
                                else startMicListening();
                            }}
                            className={`h-10 border rounded-xl flex items-center justify-center text-[10px] font-bold transition-all active:scale-95 ${
                                isListening
                                    ? 'bg-blue-600 text-white border-blue-400 animate-pulse'
                                    : 'bg-neutral-950 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                            }`}
                        >
                            {isListening ? <Send className="w-3.5 h-3.5" /> : 'TALK / OK'}
                        </button>

                        <button
                            type="button"
                            onClick={handleEndCall}
                            disabled={callState === 'idle'}
                            className="h-10 bg-rose-700 hover:bg-rose-600 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center justify-center shadow transition-all disabled:opacity-50"
                        >
                            <PhoneOff className="w-4 h-4" />
                        </button>
                    </div>

                    {/* 3x4 Physical Numeric Keypad with DTMF Tones */}
                    <div className="w-full grid grid-cols-3 gap-2 mt-3 px-1">
                        {KEYPAD_KEYS.map((k) => (
                            <button
                                key={k.num}
                                type="button"
                                onClick={() => handleKeyPress(k)}
                                className="h-12 bg-neutral-950/95 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700/80 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 shadow-md group"
                            >
                                <span className="text-sm font-bold text-neutral-100 group-hover:text-emerald-400 transition-colors">
                                    {k.num}
                                </span>
                                <span className="text-[8px] text-neutral-400 font-mono tracking-tighter leading-none">
                                    {k.sub}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Bottom Mic Hole */}
                    <div className="w-2 h-2 bg-neutral-950 rounded-full mt-3 shadow-inner"></div>
                </div>

                {/* Statutory Clause Assessment Status from Database */}
                <div className="w-full max-w-sm mt-3 p-3 rounded-2xl bg-card border border-border shadow-xs space-y-2">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                        <span>IVR Statutory Assessment</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">Abel Kebede</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="p-2 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
                            <span className="text-[10px] font-medium text-foreground">Age 15+ :</span>
                            <Badge
                                className={`text-[8px] font-mono uppercase font-bold py-0 h-4 ${
                                    verdicts.age_15_plus === 'met'
                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                        : verdicts.age_15_plus === 'not_met'
                                          ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                          : 'bg-muted text-muted-foreground border border-border'
                                }`}
                            >
                                {verdicts.age_15_plus}
                            </Badge>
                        </div>
                        <div className="p-2 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
                            <span className="text-[10px] font-medium text-foreground">20h/wk (26 wks):</span>
                            <Badge
                                className={`text-[8px] font-mono uppercase font-bold py-0 h-4 ${
                                    verdicts.hours_threshold === 'met'
                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                        : verdicts.hours_threshold === 'unclear'
                                          ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
                                          : verdicts.hours_threshold === 'not_met'
                                            ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                            : 'bg-muted text-muted-foreground border border-border'
                                }`}
                            >
                                {verdicts.hours_threshold}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Stage Lens Footer Note */}
                <div className="w-full max-w-sm mt-2 text-center text-[10px] text-neutral-500 dark:text-neutral-400">
                    Addis AI Voices (Amharic) • Addis AI STT • Dual-Tone DTMF Generator
                </div>
            </div>
        </>
    );
}
