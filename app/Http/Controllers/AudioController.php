<?php

namespace App\Http\Controllers;

use App\Services\AddisAiVoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Ai\Transcription;

class AudioController extends Controller
{
    public function __construct(
        private AddisAiVoice $addisAi,
    ) {}

    /**
     * Transcribe incoming audio (Amharic / Afaan Oromo via Addis AI, or English via Groq Whisper)
     */
    public function transcribe(Request $request): JsonResponse
    {
        $request->validate([
            'audio' => 'required|file',
        ]);

        $file = $request->file('audio');
        $lang = $request->input('language', 'am');

        // 1. If Amharic or Afaan Oromo, try Addis AI first
        if (in_array($lang, ['am', 'om']) && env('ADDIS_API_KEY')) {
            try {
                $transcriptText = $this->addisAi->transcribe($file->getRealPath(), $lang);
                if (!empty($transcriptText)) {
                    return response()->json([
                        'text' => trim($transcriptText),
                        'provider' => 'addis-ai-stt',
                        'language' => $lang,
                    ]);
                }
            } catch (\Throwable $e) {
                // Fall through to Groq Whisper or fallback
            }
        }

        // 2. Try OpenAI Whisper API if OPENAI_API_KEY is configured
        $openAiKey = config('ai.providers.openai.key') ?? env('OPENAI_API_KEY');
        if ($openAiKey) {
            try {
                $response = Http::withToken($openAiKey)
                    ->attach(
                        'file',
                        file_get_contents($file->getRealPath()),
                        $file->getClientOriginalName() ?: 'audio.webm'
                    )
                    ->post('https://api.openai.com/v1/audio/transcriptions', [
                        'model' => 'whisper-1',
                        'response_format' => 'json',
                        'temperature' => 0.0,
                    ]);

                if ($response->successful()) {
                    $text = $response->json('text') ?? '';
                    return response()->json([
                        'text' => trim($text),
                        'provider' => 'openai-whisper-1',
                        'language' => $lang,
                    ]);
                }
            } catch (\Throwable $e) {
                // Fall through
            }
        }

        // 3. Try direct Groq Whisper API (whisper-large-v3-turbo)
        $groqKey = config('ai.providers.groq.key') ?? env('GROQ_API_KEY');
        if ($groqKey) {
            try {
                $response = Http::withToken($groqKey)
                    ->attach(
                        'file',
                        file_get_contents($file->getRealPath()),
                        $file->getClientOriginalName() ?: 'audio.webm'
                    )
                    ->post('https://api.groq.com/openai/v1/audio/transcriptions', [
                        'model' => 'whisper-large-v3-turbo',
                        'response_format' => 'json',
                        'temperature' => 0.0,
                    ]);

                if ($response->successful()) {
                    $text = $response->json('text') ?? '';
                    return response()->json([
                        'text' => trim($text),
                        'provider' => 'groq-whisper-turbo',
                        'language' => $lang,
                    ]);
                }
            } catch (\Throwable $e) {
                // Fall through
            }
        }

        // 4. Try Laravel AI SDK Transcription
        try {
            $transcript = Transcription::fromUpload($file)->generate();
            return response()->json([
                'text' => (string) $transcript,
                'provider' => 'laravel-ai-transcription',
                'language' => $lang,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'text' => 'Recorded voice transcript received.',
                'provider' => 'local-fallback',
                'language' => $lang,
            ]);
        }
    }

    /**
     * Generate spoken audio via Addis Voices 2 (Amharic) or OpenAI TTS (English)
     */
    public function speak(Request $request): JsonResponse
    {
        $request->validate([
            'text' => 'required|string',
            'language' => 'nullable|string',
            'voice_id' => 'nullable|string',
        ]);

        $text = $request->input('text');
        $lang = $request->input('language', 'am');
        $voiceId = $request->input('voice_id');

        // 1. If Amharic, use Addis AI Addis Voices 2
        if (in_array($lang, ['am', 'om']) && env('ADDIS_API_KEY')) {
            try {
                $audioUrl = $this->addisAi->speak($text, $lang, $voiceId);
                if (!empty($audioUrl)) {
                    return response()->json([
                        'audio_url' => $audioUrl,
                        'provider' => 'addis-voices-2',
                    ]);
                }
            } catch (\Throwable $e) {
                // Fall back
            }
        }

        // 2. If English and OpenAI key present, use OpenAI TTS
        $openAiKey = config('ai.providers.openai.key') ?? env('OPENAI_API_KEY');
        if ($lang === 'en' && $openAiKey) {
            try {
                $response = Http::withToken($openAiKey)->post('https://api.openai.com/v1/audio/speech', [
                    'model' => 'tts-1',
                    'input' => $text,
                    'voice' => 'alloy',
                    'response_format' => 'mp3',
                ]);

                if ($response->successful()) {
                    $base64 = base64_encode($response->body());
                    return response()->json([
                        'audio_url' => "data:audio/mp3;base64,{$base64}",
                        'provider' => 'openai-tts',
                    ]);
                }
            } catch (\Throwable $e) {
                // Fall back
            }
        }

        return response()->json([
            'audio_url' => null,
            'provider' => 'browser-speech-synthesis',
            'message' => 'Using browser speech synthesis fallback.',
        ]);
    }

    /**
     * Translate text via Addis AI (/api/v1/translate)
     */
    public function translate(Request $request): JsonResponse
    {
        $request->validate([
            'text' => 'required|string',
            'from' => 'nullable|string',
            'to' => 'nullable|string',
        ]);

        $translated = $this->addisAi->translate(
            $request->input('text'),
            $request->input('from', 'am'),
            $request->input('to', 'en')
        );

        return response()->json([
            'original' => $request->input('text'),
            'translated' => $translated,
            'provider' => 'addis-ai-translate',
        ]);
    }

    /**
     * Cost estimate for Addis Voices TTS generation
     */
    public function estimate(Request $request): JsonResponse
    {
        $request->validate([
            'text' => 'required|string',
            'language' => 'nullable|string',
            'voice_id' => 'nullable|string',
        ]);

        $estimate = $this->addisAi->estimate(
            $request->input('text'),
            $request->input('language', 'am'),
            $request->input('voice_id')
        );

        return response()->json($estimate);
    }
}
