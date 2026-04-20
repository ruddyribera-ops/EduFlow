<?php

namespace App\Policies;

use App\Models\Student;
use App\Models\User;

class StudentPolicy
{
    /**
     * Admin and counselor can create students.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR]);
    }

    /**
     * Admin and counselor can update students.
     */
    public function update(User $user, Student $student): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR]);
    }

    /**
     * Admin and counselor can delete students.
     */
    public function delete(User $user, Student $student): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR]);
    }

    /**
     * Any authenticated user can view a student.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Any authenticated user can view a student.
     */
    public function view(User $user, Student $student): bool
    {
        return true;
    }
}
