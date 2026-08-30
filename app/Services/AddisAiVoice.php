<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class AddisAiVoice
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = (string) (config('services.addis.base_url') ?? env('ADDIS_BASE_URL') ?? 'https://api.addisassistant.com');
        $this->apiKey = (string) (config('services.addis.api_key') ?? env('ADDIS_API_KEY') ?? '');
    }

    /**
     * Transcribe a short (<=60s, <=10MB) audio file. Amharic = 'am', Afaan Oromo = 'om'.
     */
    public function transcribe(string $audioPath, string $languageCode = 'am'): string
    {
        if (empty($this->apiKey)) {
            return '';
        }

        try {
            $response = Http::timeout(4)
                ->withHeaders([
                    'x-api-key' => $this->apiKey,
                ])
                ->attach('audio', file_get_contents($audioPath), basename($audioPath))
                ->post("{$this->baseUrl}/api/v2/stt", [
                    'request_data' => json_encode(['language_code' => $languageCode]),
                    'language_code' => $languageCode,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['data']['transcription'] 
                    ?? $data['transcription'] 
                    ?? $data['text'] 
                    ?? $data['data']['text'] 
                    ?? '';
            }
        } catch (\Throwable $e) {
            // Log or fallback
        }

        return '';
    }

    /**
     * Generate a TTS clip (Addis Voices 2) and return the durable, playable audio URL.
     * Billed 5 ETB/generated minute.
     */
    public function speak(string $text, string $languageCode = 'am', ?string $voiceId = null): string
    {
        if (empty($this->apiKey)) {
            return '';
        }

        $defaultVoice = $languageCode === 'om' ? 'om-bikila' : 'am-hamen';
        $selectedVoice = $voiceId ?: config('services.addis.default_voice_id', env('ADDIS_DEFAULT_VOICE_ID', $defaultVoice));
        if ($selectedVoice === 'om-default') {
            $selectedVoice = 'om-bikila';
        }

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'x-api-key' => $this->apiKey,
                    'content-type' => 'application/json',
                ])->post("{$this->baseUrl}/api/v1/voice/generations", [
                    'text' => $text,
                    'voice_id' => $selectedVoice,
                    'language' => $languageCode,
                    'output_format' => 'mp3_44100',
                    'client_request_id' => (string) Str::uuid(),
                ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['data']['playback']['url']
                    ?? $data['data']['audio_url'] 
                    ?? $data['audio_url'] 
                    ?? $data['data']['url'] 
                    ?? '';
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('[AddisAiVoice] Speak generation failed: ' . $e->getMessage());
        }

        return '';
    }

    public function estimate(string $text, string $languageCode = 'am', ?string $voiceId = null): array
    {
        if (empty($this->apiKey)) {
            return ['estimated_cost' => 0];
        }

        $response = Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'content-type' => 'application/json',
        ])->post("{$this->baseUrl}/api/v1/voice/estimate", [
            'text' => $text,
            'voice_id' => $voiceId ?? config('services.addis.default_voice_id', env('ADDIS_DEFAULT_VOICE_ID', 'am-hamen')),
            'language' => $languageCode,
            'output_format' => 'mp3_44100',
        ]);

        $response->throw();

        return $response->json('data') ?? $response->json() ?? [];
    }

    /**
     * Translate Amharic <-> English via Addis AI (/api/v1/translate)
     */
    public function translate(string $text, string $from = 'am', string $to = 'en'): string
    {
        if (empty($this->apiKey)) {
            return $text;
        }

        try {
            $response = Http::withHeaders([
                'x-api-key' => $this->apiKey,
                'content-type' => 'application/json',
            ])->post("{$this->baseUrl}/api/v1/translate", [
                'text' => $text,
                'source_language' => $from,
                'target_language' => $to,
            ]);

            if ($response->successful()) {
                return $response->json('data.translated_text') ?? $response->json('translated_text') ?? $text;
            }
        } catch (\Throwable $e) {
            // Fall back to original text
        }

        return $text;
    }
}
