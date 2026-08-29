<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Beneficiary extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'persona_type',
        'phone_type',
        'language',
    ];

    public function interviews(): HasMany
    {
        return $this->hasMany(Interview::class);
    }
}
