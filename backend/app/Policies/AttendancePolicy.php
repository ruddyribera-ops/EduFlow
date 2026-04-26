<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Attendance;
use Illuminate\Auth\Access\HandlesAuthorization;

class AttendancePolicy
{
    use HandlesAuthorization;

    /**
     * Teachers can only mark attendance for their assigned sections.
     * Receptionists can mark/update anyone (late arrivals from front desk).
     * Coordinators/admins/directors see all.
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

    public function view(User $user, Attendance $attendance): bool
    {
        if (in_array($user->role, [User::ROLE_ADMIN, User::ROLE_DIRECTOR, User::ROLE_COORDINATOR, User::ROLE_COUNSELOR])) {
            return true;
        }

        if ($user->role === User::ROLE_RECEPTIONIST) {
            return true;
        }

        // Teacher: can only view if assigned to the section
        if ($user->role === User::ROLE_TEACHER) {
            $assignedSections = $user->assigned_sections ?? [];
            return in_array($attendance->section_id, $assignedSections);
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
            User::ROLE_TEACHER,
        ]);
    }

    /**
     * Teachers can only mark attendance for their own sections.
     * Receptionists can update (mark late arrivals) for any section.
     */
    public function update(User $user, Attendance $attendance): bool
    {
        // Admins/directors can update any
        if (in_array($user->role, [User::ROLE_ADMIN, User::ROLE_DIRECTOR, User::ROLE_COORDINATOR])) {
            return true;
        }

        // Receptionist can update any (late arrivals from front desk)
        if ($user->role === User::ROLE_RECEPTIONIST) {
            return true;
        }

        // Teacher: can only update if assigned to this section
        if ($user->role === User::ROLE_TEACHER) {
            $assignedSections = $user->assigned_sections ?? [];
            return in_array($attendance->section_id, $assignedSections);
        }

        return false;
    }

    public function delete(User $user, Attendance $attendance): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_DIRECTOR]);
    }
}