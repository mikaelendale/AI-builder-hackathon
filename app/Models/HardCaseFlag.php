<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HardCaseFlag extends Model
{
    use HasFactory;

    protected $fillable = [
        'interview_id',
        'type',
        'detail',
        'resolved_action',
    ];

    public function interview(): BelongsTo
    {
        return $this->belongsTo(Interview::class);
    }
}
