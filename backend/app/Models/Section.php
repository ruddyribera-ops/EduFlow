<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Section extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'grade_level',
        'room',
        'counselor_id',
        'semester',
    ];

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'section_student');
    }

    /**
     * Teachers via N:M pivot (section_teacher).
     * A section can have multiple teachers (co-teaching support).
     * The `teacher_id` column on sections is deprecated - use pivot instead.
     */
    public function teachers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'section_teacher', 'section_id', 'teacher_id');
    }

    public function counselor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counselor_id');
    }
}