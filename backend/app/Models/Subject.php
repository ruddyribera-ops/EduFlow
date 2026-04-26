<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Subject extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'code',
        'area',
        'campo',
        'level',
    ];

    public function sections(): BelongsToMany
    {
        return $this->belongsToMany(Section::class, 'section_subjects');
    }
}