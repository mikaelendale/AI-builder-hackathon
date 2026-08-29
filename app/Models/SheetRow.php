<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SheetRow extends Model
{
    use HasFactory;

    protected $fillable = [
        'interview_id',
        'job_position',
        'gender',
        'age_band',
        'monthly_salary_etb',
        'is_good_job',
        'employer_reported_value',
        'worker_reported_value',
        'discrepancy_flag',
        'confirmation_source',
        'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'is_good_job' => 'boolean',
            'discrepancy_flag' => 'boolean',
            'monthly_salary_etb' => 'integer',
            'employer_reported_value' => 'integer',
            'worker_reported_value' => 'integer',
            'confirmed_at' => 'datetime',
        ];
    }

    public function interview(): BelongsTo
    {
        return $this->belongsTo(Interview::class);
    }
}
