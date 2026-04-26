<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Incident extends Model
{
    use HasFactory, HasUuids;

    public const TYPE_MEDICAL = 'medical';
    public const TYPE_BEHAVIORAL = 'behavioral';
    public const TYPE_LATE_ARRIVAL = 'late_arrival';
    public const TYPE_EARLY_DISMISSAL = 'early_dismissal';
    public const TYPE_VISITOR = 'visitor';
    public const TYPE_OTHER = 'other';

    public const SEVERITY_LOW = 'low';
    public const SEVERITY_MEDIUM = 'medium';
    public const SEVERITY_HIGH = 'high';

    protected $fillable = [
        'student_id',
        'reported_by_user_id',
        'type',
        'severity',
        'description',
        'occurred_at',
        'resolved_at',
        'resolved_by_user_id',
        'resolution_notes',
        'notify_coordinator',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
        'resolved_at' => 'datetime',
        'notify_coordinator' => 'boolean',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by_user_id');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by_user_id');
    }

    public function isResolved(): bool
    {
        return $this->resolved_at !== null;
    }
}