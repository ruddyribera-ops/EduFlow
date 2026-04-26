<?php

namespace App\Policies;

use App\Models\User;
use App\Models\ParentMeeting;
use Illuminate\Auth\Access\HandlesAuthorization;

class ParentMeetingPolicy
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

    public function view(User $user, ParentMeeting $parentMeeting): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, [
            User::ROLE_ADMIN,
            User::ROLE_DIRECTOR,
            User::ROLE_COORDINATOR,
            User::ROLE_COUNSELOR,
        ]);
    }

    public function update(User $user, ParentMeeting $parentMeeting): bool
    {
        return in_array($user->role, [
            User::ROLE_ADMIN,
            User::ROLE_DIRECTOR,
            User::ROLE_COORDINATOR,
            User::ROLE_COUNSELOR,
        ]);
    }

    public function delete(User $user, ParentMeeting $parentMeeting): bool
    {
        return in_array($user->role, [
            User::ROLE_ADMIN,
            User::ROLE_DIRECTOR,
        ]);
    }
}