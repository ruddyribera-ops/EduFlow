<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParentMeeting extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'meeting_date',
        'tutor_name',
        'day_time',
        'attendees',
        'modality',
        'confirmation',
        'observation',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    protected $casts = [
        'meeting_date' => 'date',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    /**
     * Splits comma-separated attendees string into array.
     */
    public function getAttendeesListAttribute(): array
    {
        if (empty($this->attendees)) {
            return [];
        }

        return array_filter(
            array_map('trim', explode(',', $this->attendees)),
            fn ($name) => $name !== ''
        );
    }

    /**
     * Combined scheduled date and time string.
     */
    public function getScheduledDateAndTimeAttribute(): ?string
    {
        if (!$this->meeting_date) {
            return null;
        }

        $date = $this->meeting_date->format('Y-m-d');
        $time = $this->day_time ? " {$this->day_time}" : '';

        return "{$date}{$time}";
    }
}