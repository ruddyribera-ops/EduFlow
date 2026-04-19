<?php

namespace App\Policies;

use App\Models\Section;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SectionPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR, User::ROLE_TEACHER]);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Section $section): bool
    {
        // FERPA: Teachers can only view sections they teach
        if ($user->role === User::ROLE_TEACHER) {
            return $section->teachers()->where('users.id', $user->id)->exists();
        }

        // Admins and counselors can view all
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR]);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->role === User::ROLE_ADMIN;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Section $section): bool
    {
        if ($user->role === User::ROLE_ADMIN) {
            return true;
        }

        if ($user->role === User::ROLE_COUNSELOR) {
            return $section->counselor_id === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Section $section): bool
    {
        return $user->role === User::ROLE_ADMIN;
    }

    /**
     * Determine whether the user can assign teachers to a section.
     */
    public function assignTeachers(User $user): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR]);
    }
}