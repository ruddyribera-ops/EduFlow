<?php

namespace App\Policies;

use App\Models\Guardian;
use App\Models\Student;
use App\Models\User;

class GuardianPolicy
{
    /**
     * Admin and counselor can create guardians.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR]);
    }

    /**
     * Admin and counselor can update guardians.
     */
    public function update(User $user, Guardian $guardian): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR]);
    }

    /**
     * Admin and counselor can delete guardians.
     */
    public function delete(User $user, Guardian $guardian): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR]);
    }

    /**
     * Admin and counselor can attach a guardian to a student.
     */
    public function attachToStudent(User $user, Guardian $guardian, Student $student): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR]);
    }

    /**
     * Admin and counselor can detach a guardian from a student.
     */
    public function detachFromStudent(User $user, Guardian $guardian, Student $student): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR]);
    }

    /**
     * Any authenticated user can view guardians.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Any authenticated user can view a guardian.
     */
    public function view(User $user, Guardian $guardian): bool
    {
        return true;
    }
}
