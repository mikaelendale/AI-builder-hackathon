<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClauseAssessment extends Model
{
    use HasFactory;

    protected $fillable = [
        'interview_id',
        'clause_key',
        'status',
        'confidence',
        'verifier_flag',
        'verifier_note',
        'evidence_quote',
        'raw_llm_output',
        'sdg_tags',
    ];

    protected function casts(): array
    {
        return [
            'confidence' => 'float',
            'verifier_flag' => 'boolean',
            'raw_llm_output' => 'array',
            'sdg_tags' => 'array',
        ];
    }

    public function interview(): BelongsTo
    {
        return $this->belongsTo(Interview::class);
    }
}
