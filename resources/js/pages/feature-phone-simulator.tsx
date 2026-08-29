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
    } | null;
}

const KEYPAD_KEYS = [
    { num: '1', sub: '.,' },
    { num: '2', sub: 'ABC' },
    { num: '3', sub: 'DEF' },
    { num: '4', sub: 'GHI' },
    { num: '5', sub: 'JKL' },
    { num: '6', sub: 'MNO' },
    { num: '7', sub: 'PQRS' },
    { num: '8', sub: 'TUV' },
    { num: '9', sub: 'WXYZ' },
    { num: '*', sub: ' ' },
    { num: '0', sub: '+' },
    { num: '#', sub: ' ' },
];

export default function FeaturePhoneSimulator({ interview }: FeaturePhoneSimulatorProps) {
    const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
    const [lcdLines, setLcdLines] = useState<string[]>([
        'ITEL / TECNO 2160',
        '2G ETHIO TELECOM',
        'Press CALL to start',
    ]);
    const [inputBuffer, setInputBuffer] = useState('');
    const [scriptMode, setScriptMode] = useState<'fidel' | 'latin'>('fidel');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    // Audio TTS playback
    const speakPrompt = (text: string) => {
        setIsSpeaking(true);
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.92;
            utterance.lang = 'am-ET';
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
        } else {
            setIsSpeaking(false);
        }
    };

    const handleStartCall = () => {
        setCallState('calling');
        setLcdLines(['Calling...', 'seqa Verification IVR', 'Connecting 8421#']);

        setTimeout(() => {
            setCallState('connected');
            const welcomeText =
                scriptMode === 'fidel'
                    ? 'እንኳን ወደ ሴኳ የድጋፍ ማረጋገጫ መስመር በደህና መጡ።'
                    : 'Enkwan wede sequa maregagecha mesmer bedehena metu.';
            setLcdLines([
                'CONNECTED 00:01',
                welcomeText,
                scriptMode === 'fidel' ? '1=ስም 2=ሥራ 3=ሰዓት' : '1=Name 2=Job 3=Hours',
            ]);
            speakPrompt('እንኳን ወደ ሴኳ የሥራ ማረጋገጫ መስመር በደህና መጡ። ስምዎን እና የሥራ ሁኔታዎን ያረጋግጡ።');
        }, 1500);
    };

    const handleEndCall = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setCallState('ended');
        setLcdLines(['CALL ENDED', 'Duration 01:24', 'Record Synced #8421']);
        setTimeout(() => {
            setCallState('idle');
            setLcdLines(['ITEL / TECNO 2160', '2G ETHIO TELECOM', 'Press CALL to start']);
        }, 2000);
    };

    const handleKeyPress = (num: string) => {
        if (callState !== 'connected') {
            setInputBuffer((prev) => (prev + num).slice(-10));
            return;
        }

        setInputBuffer((prev) => (prev + num).slice(-6));

        if (num === '1') {
            const prompt =
                scriptMode === 'fidel'
                    ? 'አቤል ከበደ: 19 ዓመት'
                    : 'Abel Kebede: 19 years';
            setLcdLines(['[1] BENEFICIARY', prompt, 'Status: VERIFIED']);
            speakPrompt('አቤል ከበደ፣ 19 ዓመት፣ ኮንስትራክሽን።');
        } else if (num === '2') {
            const prompt =
                scriptMode === 'fidel'
                    ? 'የሳምንት ሰዓት ስንት ነው?'
                    : 'Betelemadew sint se\'at?';
            setLcdLines(['[2] HOURS PROBE', prompt, 'Press digits + #']);
            speakPrompt('በተለመደው ሳምንት ውስጥ ስንት ሰዓት ይሠራሉ?');
        } else if (num === '3') {
            const prompt =
                scriptMode === 'fidel'
                    ? 'ክፍያ: በጥሬ ገንዘብ'
                    : 'Payment: Daily Cash';
            setLcdLines(['[3] WAGE REPORT', prompt, 'Resolved: UNCLEAR']);
            speakPrompt('ክፍያ በጥሬ ገንዘብ ይከፈላል።');
        } else if (num === '#') {
            setLcdLines(['INPUT RECEIVED', `Buffer: ${inputBuffer}`, 'Saved to Sheet']);
            setInputBuffer('');
        }
    };

    return (
        <>
            <Head title="Feature Phone IVR Voice Simulator — Abel's Persona" />

            <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center p-3 sm:p-6 transition-colors duration-200">
                {/* Top Banner Navigation */}
                <div className="w-full max-w-sm mb-3 flex items-center justify-between">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.visit('/interview')}
                        className="h-8 text-xs text-neutral-600 dark:text-neutral-300"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Smartphone View
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setScriptMode((m) => (m === 'fidel' ? 'latin' : 'fidel'))}
                            className="h-8 text-xs font-mono border-neutral-300 dark:border-neutral-700"
                        >
                            <Globe className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            {scriptMode === 'fidel' ? 'ፊደል (Fidel)' : 'Latin Translit'}
                        </Button>
                        <ThemeToggle />
                    </div>
                </div>

                {/* Feature Phone Casing (Itel / Nokia / Tecno Style) */}
                <div className="w-[300px] bg-neutral-800 dark:bg-neutral-900 border-4 border-neutral-700 rounded-[2.5rem] p-4 shadow-2xl flex flex-col items-center relative text-neutral-100">
                    {/* Earpiece Speaker */}
                    <div className="w-16 h-1.5 bg-neutral-950 rounded-full mb-3 shadow-inner"></div>

                    {/* Brand Label */}
                    <div className="text-[10px] tracking-widest text-neutral-400 font-bold mb-2 uppercase">
                        sequa • IVR 2G
                    </div>

                    {/* Monochrome LCD Screen */}
                    <div className="w-full h-36 bg-[#4c6340] text-[#13240e] border-4 border-neutral-950 rounded-xl p-2.5 font-mono text-xs flex flex-col justify-between shadow-inner relative overflow-hidden">
                        {/* Status bar */}
                        <div className="flex items-center justify-between text-[10px] font-bold border-b border-[#3b4e31] pb-1">
                            <span className="flex items-center gap-1">
                                <Radio className="w-2.5 h-2.5 animate-pulse" /> 2G
                            </span>
                            <span>{callState === 'connected' ? 'CALL 01:24' : 'IDLE'}</span>
                            <span>[===]</span>
                        </div>

                        {/* LCD Main Text Lines */}
                        <div className="space-y-1 my-auto">
                            {lcdLines.map((line, idx) => (
                                <div key={idx} className="truncate font-semibold text-[11px]">
                                    {line}
                                </div>
                            ))}
                        </div>

                        {/* LCD Bottom Input Buffer */}
                        <div className="flex items-center justify-between text-[10px] border-t border-[#3b4e31] pt-0.5">
                            <span>Key: {inputBuffer || '_'}</span>
                            {isSpeaking && <span className="animate-pulse font-bold">AUDIO ON</span>}
                        </div>
                    </div>

                    {/* Navigation D-Pad & Action Buttons */}
                    <div className="w-full grid grid-cols-3 gap-2 mt-4 px-2">
                        <button
                            type="button"
                            onClick={handleStartCall}
                            disabled={callState === 'connected' || callState === 'calling'}
                            className="h-10 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center shadow transition-all active:scale-95 disabled:opacity-50"
                        >
                            <PhoneCall className="w-4 h-4" />
                        </button>

                        <div className="h-10 bg-neutral-950 border border-neutral-700 rounded-xl flex items-center justify-center text-[10px] text-neutral-400 font-bold">
                            OK
                        </div>

                        <button
                            type="button"
                            onClick={handleEndCall}
                            disabled={callState === 'idle'}
                            className="h-10 bg-rose-700 hover:bg-rose-600 text-white rounded-xl font-bold text-xs flex items-center justify-center shadow transition-all active:scale-95 disabled:opacity-50"
                        >
                            <PhoneOff className="w-4 h-4" />
                        </button>
                    </div>

                    {/* 3x4 Physical Numeric Keypad */}
                    <div className="w-full grid grid-cols-3 gap-2 mt-3 px-1">
                        {KEYPAD_KEYS.map((k) => (
                            <button
                                key={k.num}
                                type="button"
                                onClick={() => handleKeyPress(k.num)}
                                className="h-12 bg-neutral-950/90 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700/80 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 shadow-md"
                            >
                                <span className="text-sm font-bold text-neutral-100">{k.num}</span>
                                <span className="text-[8px] text-neutral-400 font-mono tracking-tighter leading-none">
                                    {k.sub}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Bottom Mic Hole */}
                    <div className="w-1.5 h-1.5 bg-neutral-950 rounded-full mt-3 shadow-inner"></div>
                </div>

                {/* Stage Lens Footer Note */}
                <div className="w-full max-w-sm mt-3 text-center text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">Feature 4 & 5:</span> Abel's Feature-Phone IVR Simulator + Transliterated Amharic Script.
                </div>
            </div>
        </>
    );
}
