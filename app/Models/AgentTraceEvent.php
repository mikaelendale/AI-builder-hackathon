<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentTraceEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'interview_id',
        'agent_name',
        'event_type',
        'summary',
        'duration_ms',
        'detail',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'duration_ms' => 'integer',
            'detail' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    public function interview(): BelongsTo
    {
        return $this->belongsTo(Interview::class);
    }
}