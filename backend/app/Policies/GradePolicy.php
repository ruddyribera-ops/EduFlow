<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Grade;
use Illuminate\Auth\Access\HandlesAuthorization;

class GradePolicy
{
    use HandlesAuthorization;

    /**
     * Teachers enter grades for their assigned sections.
     * Coordinators can view/override grades for their department.
     * Admins/directors see all.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, [
            User::ROLE_ADMIN,
            User::ROLE_DIRECTOR,
            User::ROLE_COORDINATOR,
            User::ROLE_RECEPTIONIST,
            User::ROLE_TEACHER,
            User::ROLE_COUNSELOR,
        ]);
    }

    public function view(User $user, Grade $grade): bool
    {
        if (in_array($user->role, [User::ROLE_ADMIN, User::ROLE_DIRECTOR, User::ROLE_COORDINATOR, User::ROLE_COUNSELOR])) {
            return true;
        }

        if ($user->role === User::ROLE_RECEPTIONIST) {
            return true; // Can view for reporting purposes
        }

        // Teacher: can only view if assigned to the section
        if ($user->role === User::ROLE_TEACHER) {
            $assignedSections = $user->assigned_sections ?? [];
            return in_array($grade->section_id, $assignedSections);
        }

        return false;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, [
            User::ROLE_ADMIN,
            User::ROLE_DIRECTOR,
            User::ROLE_COORDINATOR,
            User::ROLE_TEACHER,
        ]);
    }

    public function update(User $user, Grade $grade): bool
    {
        // Admins/directors can update any
        if (in_array($user->role, [User::ROLE_ADMIN, User::ROLE_DIRECTOR])) {
            return true;
        }

        // Coordinators can override any grade in their department
        if ($user->role === User::ROLE_COORDINATOR) {
            return true; // Department scope handled at controller level
        }

        // Teacher: can only update grades in their assigned sections
        if ($user->role === User::ROLE_TEACHER) {
            $assignedSections = $user->assigned_sections ?? [];
            return in_array($grade->section_id, $assignedSections);
        }

        return false;
    }

    public function delete(User $user, Grade $grade): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_DIRECTOR]);
    }
}