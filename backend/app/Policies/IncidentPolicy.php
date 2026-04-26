<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Incident;
use Illuminate\Auth\Access\HandlesAuthorization;

class IncidentPolicy
{
    use HandlesAuthorization;

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

    public function view(User $user, Incident $incident): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
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

    /**
     * Admins/directors can update everything.
     * Coordinators can resolve incidents.
     * Receptionists can report incidents (update reported fields).
     */
    public function update(User $user, Incident $incident): bool
    {
        if (in_array($user->role, [User::ROLE_ADMIN, User::ROLE_DIRECTOR, User::ROLE_COORDINATOR])) {
            return true;
        }

        if ($user->role === User::ROLE_RECEPTIONIST) {
            return true;
        }

        return false;
    }

    public function resolve(User $user, Incident $incident): bool
    {
        return in_array($user->role, [
            User::ROLE_ADMIN,
            User::ROLE_DIRECTOR,
            User::ROLE_COORDINATOR,
        ]);
    }
}