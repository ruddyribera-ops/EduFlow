<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParentMeeting extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'student_id',
        'meeting_date',
        'tutor_name',
        'day_time',
        'attendees',
        'modality',
        'confirmation',
        'observation',
    ];

    protected $casts = [
        'meeting_date' => 'date',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
