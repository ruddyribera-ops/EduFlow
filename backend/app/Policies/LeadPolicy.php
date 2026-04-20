<?php

namespace App\Policies;

use App\Models\EnrollmentLead;
use App\Models\User;

class LeadPolicy
{
    /**
     * Admin and counselor can create leads.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR]);
    }

    /**
     * Admin and counselor can update leads (full update).
     */
    public function update(User $user, EnrollmentLead $lead): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR]);
    }

    /**
     * Admin and counselor can delete leads.
     */
    public function delete(User $user, EnrollmentLead $lead): bool
    {
        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR]);
    }

    /**
     * Any authenticated user can view leads.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Any authenticated user can view a lead.
     */
    public function view(User $user, EnrollmentLead $lead): bool
    {
        return true;
    }
}
