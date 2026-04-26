<?php

namespace App\Models;

use App\Enums\CommunicationPreference;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\HasApiTokens;

class Guardian extends Model
{
    use HasApiTokens, HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'password',
        'passwordless_login_token',
        'passwordless_token_expires_at',
        'communication_preference',
        'household_id',
        'is_primary',
    ];

    protected $hidden = [
        'password',
        'passwordless_login_token',
    ];

    protected $casts = [
        'passwordless_token_expires_at' => 'datetime',
        'is_primary' => 'boolean',
        'communication_preference' => CommunicationPreference::class,
    ];

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'household_members')
            ->withPivot(['relationship_type', 'is_emergency_contact', 'can_pickup'])
            ->withTimestamps();
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    /**
     * Hash password when set.
     */
    public function setPasswordAttribute(?string $value): void
    {
        $this->attributes['password'] = $value ? Hash::make($value) : null;
    }

    /**
     * @deprecated Use $guardian->communication_preference->includesEmail() instead
     */
    public function prefersEmail(): bool
    {
        return $this->communication_preference->includesEmail();
    }

    /**
     * @deprecated Use $guardian->communication_preference->includesSms() instead
     */
    public function prefersSms(): bool
    {
        return $this->communication_preference->includesSms();
    }
}