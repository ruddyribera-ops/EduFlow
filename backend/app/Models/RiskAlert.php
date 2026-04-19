<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiskAlert extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'student_id',
        'counselor_id',
        'attendance_rate',
        'grade_drop_percentage',
        'risk_factors',
        'status',
    ];

    protected $casts = [
        'risk_factors' => 'array',
        'attendance_rate' => 'decimal:2',
        'grade_drop_percentage' => 'decimal:2',
    ];

    public const STATUS_PENDING = 'pending';
    public const STATUS_REVIEWED = 'reviewed';
    public const STATUS_ESCALATED = 'escalated';

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function counselor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counselor_id');
    }
}