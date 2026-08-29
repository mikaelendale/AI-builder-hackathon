<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Ai\Transcription;

class AudioController extends Controller
{
    /**
     * Transcribe incoming audio (English / Amharic) via Groq Whisper API
     */
    public function transcribe(Request $request): JsonResponse
    {
        $request->validate([
            'audio' => 'required|file',
        ]);

        $file = $request->file('audio');
        $groqKey = config('ai.providers.groq.key') ?? env('GROQ_API_KEY');

        // 1. Try direct Groq Whisper API if key is present
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
                    ]);
                }
            } catch (\Throwable $e) {
                // Fallback to Laravel AI Transcription or local heuristic
            }
        }

        // 2. Try Laravel AI Transcription driver
        try {
            $transcript = Transcription::fromUpload($file)->generate();
            return response()->json([
                'text' => (string) $transcript,
                'provider' => 'laravel-ai-transcription',
            ]);
        } catch (\Throwable $e) {
            // Local fallback for offline testing
            return response()->json([
                'text' => 'Recorded voice transcript received.',
                'provider' => 'local-fallback',
                'note' => 'Audio received. Set GROQ_API_KEY in .env for live cloud Whisper transcription.',
            ]);
        }
    }
}
