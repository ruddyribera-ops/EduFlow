<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Only admin can create users.
     */
    public function create(User $user): bool
    {
        return $user->role === User::ROLE_ADMIN;
    }

    /**
     * Admins can update any user.
     * Users can update their own name + email (but not role or password).
     */
    public function update(User $authUser, User $user): bool
    {
        if ($authUser->role === User::ROLE_ADMIN) {
            return true;
        }
        // Self-update: name + email only (handled at controller level, not here)
        return $authUser->id === $user->id;
    }

    /**
     * Only admin can delete users.
     * Users cannot delete themselves.
     */
    public function delete(User $authUser, User $user): bool
    {
        if ($authUser->role !== User::ROLE_ADMIN) {
            return false;
        }
        return $authUser->id !== $user->id;
    }

    /**
     * Only admin can reset a user's password.
     */
    public function resetPassword(User $authUser, User $user): bool
    {
        return $authUser->role === User::ROLE_ADMIN;
    }

    /**
     * Any authenticated user can view another user.
     */
    public function view(User $authUser, User $user): bool
    {
        return true;
    }
}
