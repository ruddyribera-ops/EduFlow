<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, SoftDeletes;

    public const ROLE_ADMIN = 'admin';
    public const ROLE_DIRECTOR = 'director';
    public const ROLE_COORDINATOR = 'coordinator';
    public const ROLE_RECEPTIONIST = 'receptionist';
    public const ROLE_TEACHER = 'teacher';
    public const ROLE_COUNSELOR = 'counselor';
    public const ROLE_GUARDIAN = 'guardian';

    public const ROLES_HIERARCHY = [
        self::ROLE_GUARDIAN => 1,
        self::ROLE_TEACHER => 2,
        self::ROLE_COUNSELOR => 2,
        self::ROLE_RECEPTIONIST => 3,
        self::ROLE_COORDINATOR => 4,
        self::ROLE_DIRECTOR => 5,
        self::ROLE_ADMIN => 6,
    ];

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'department',
        'assigned_sections',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'assigned_sections' => 'array',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isDirector(): bool
    {
        return $this->role === self::ROLE_DIRECTOR;
    }

    public function isCoordinator(): bool
    {
        return $this->role === self::ROLE_COORDINATOR;
    }

    public function isReceptionist(): bool
    {
        return $this->role === self::ROLE_RECEPTIONIST;
    }

    public function isTeacher(): bool
    {
        return $this->role === self::ROLE_TEACHER;
    }

    public function isCounselor(): bool
    {
        return $this->role === self::ROLE_COUNSELOR;
    }

    public function canManageUsers(): bool
    {
        return in_array($this->role, [self::ROLE_ADMIN, self::ROLE_DIRECTOR]);
    }

    public function canManageStudents(): bool
    {
        return in_array($this->role, [self::ROLE_ADMIN, self::ROLE_DIRECTOR, self::ROLE_COORDINATOR, self::ROLE_RECEPTIONIST]);
    }

    public function canMarkAttendance(): bool
    {
        return in_array($this->role, [self::ROLE_ADMIN, self::ROLE_DIRECTOR, self::ROLE_COORDINATOR, self::ROLE_RECEPTIONIST, self::ROLE_TEACHER]);
    }

    public function canEnterGrades(): bool
    {
        return in_array($this->role, [self::ROLE_ADMIN, self::ROLE_DIRECTOR, self::ROLE_COORDINATOR, self::ROLE_TEACHER]);
    }

    public function canViewIncidents(): bool
    {
        return in_array($this->role, [self::ROLE_ADMIN, self::ROLE_DIRECTOR, self::ROLE_COORDINATOR, self::ROLE_RECEPTIONIST, self::ROLE_TEACHER]);
    }

    public function isHighPrivilege(): bool
    {
        return in_array($this->role, [self::ROLE_ADMIN, self::ROLE_DIRECTOR, self::ROLE_COORDINATOR]);
    }

    public function taughtSections(): BelongsToMany
    {
        return $this->belongsToMany(Section::class, 'section_teacher', 'teacher_id');
    }
}