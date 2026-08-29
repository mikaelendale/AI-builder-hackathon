<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployerConfirmation extends Model
{
    use HasFactory;

    protected $fillable = [
        'interview_id',
        'confirmation_token',
        'status',
        'employer_reported_hours_per_week',
        'employer_reported_months_employed',
        'employer_note',
        'responded_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'employer_reported_hours_per_week' => 'integer',
            'employer_reported_months_employed' => 'integer',
            'responded_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function interview(): BelongsTo
    {
        return $this->belongsTo(Interview::class);
    }
}
