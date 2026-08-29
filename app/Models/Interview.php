<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Interview extends Model
{
    use HasFactory;

    protected $fillable = [
        'beneficiary_id',
        'interview_round',
        'status',
        'transcript_raw',
        'consent_given',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'interview_round' => 'integer',
            'consent_given' => 'boolean',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function beneficiary(): BelongsTo
    {
        return $this->belongsTo(Beneficiary::class);
    }

    public function clauseAssessments(): HasMany
    {
        return $this->hasMany(ClauseAssessment::class);
    }

    public function sheetRow(): HasOne
    {
        return $this->hasOne(SheetRow::class);
    }

    public function hardCaseFlags(): HasMany
    {
        return $this->hasMany(HardCaseFlag::class);
    }

    public function employerConfirmation(): HasOne
    {
        return $this->hasOne(EmployerConfirmation::class);
    }

    public function continuityCheckpoints(): HasMany
    {
        return $this->hasMany(ContinuityCheckpoint::class);
    }
}
