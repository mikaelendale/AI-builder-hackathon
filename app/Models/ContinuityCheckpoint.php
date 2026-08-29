<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContinuityCheckpoint extends Model
{
    use HasFactory;

    protected $fillable = [
        'beneficiary_id',
        'interview_id',
        'checkpoint_date',
        'still_employed_same_role',
        'cumulative_weeks_employed',
    ];

    protected function casts(): array
    {
        return [
            'checkpoint_date' => 'date',
            'still_employed_same_role' => 'boolean',
            'cumulative_weeks_employed' => 'integer',
        ];
    }

    public function beneficiary(): BelongsTo
    {
        return $this->belongsTo(Beneficiary::class);
    }

    public function interview(): BelongsTo
    {
        return $this->belongsTo(Interview::class);
    }
}
