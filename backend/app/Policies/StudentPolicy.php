<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Student;
use Illuminate\Auth\Access\HandlesAuthorization;

class StudentPolicy
{
    use HandlesAuthorization;

    /**
     * Admins and directors see all students.
     * Coordinators see students in their department (by grade_level prefix).
     * Receptionists see all students (can view any for check-in purposes).
     * Teachers see only students in their assigned sections.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, [
            User::ROLE_ADMIN,
            User::ROLE_DIRECTOR,
            User::ROLE_COORDINATOR,
            User::ROLE_RECEPTIONIST,
            User::ROLE_COUNSELOR,
        ]);
    }

    public function view(User $user, Student $student): bool
    {
        // Admins/directors/coordinators see all
        if (in_array($user->role, [User::ROLE_ADMIN, User::ROLE_DIRECTOR, User::ROLE_COORDINATOR, User::ROLE_COUNSELOR])) {
            return true;
        }

        // Receptionists can view all (for check-in / contact lookup)
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return true;
        }

        // Teachers: can only see students in their assigned sections
        if ($user->role === User::ROLE_TEACHER) {
            $assignedSections = $user->assigned_sections ?? [];
            $studentSectionIds = $student->sections()->pluck('sections.id')->toArray();

            return !empty(array_intersect($assignedSections, $studentSectionIds));
        }

        return false;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, [
            User::ROLE_ADMIN,
            User::ROLE_DIRECTOR,
            User::ROLE_COORDINATOR,
            User::ROLE_RECEPTIONIST,
        ]);
    }

    public function update(User $user, Student $student): bool
    {
        return in_array($user->role, [
            User::ROLE_ADMIN,
            User::ROLE_DIRECTOR,
            User::ROLE_COORDINATOR,
            User::ROLE_RECEPTIONIST,
        ]);
    }

    public function delete(User $user, Student $student): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_DIRECTOR]);
    }
}