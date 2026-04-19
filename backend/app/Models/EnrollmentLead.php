<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EnrollmentLead extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'status',
        'source_campaign',
        'notes',
        'assigned_counselor_id',
        'last_contacted_at',
        'enrolled_at',
    ];

    protected $casts = [
        'last_contacted_at' => 'datetime',
        'enrolled_at' => 'datetime',
    ];

    public const STATUSES = [
        'inquiry' => 'Inquiry',
        'tour_scheduled' => 'Tour Scheduled',
        'application_sent' => 'Application Sent',
        'enrolled' => 'Enrolled',
        'lost' => 'Lost',
    ];

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}