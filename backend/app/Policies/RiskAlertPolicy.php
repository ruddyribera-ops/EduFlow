<?php

namespace App\Policies;

use App\Models\RiskAlert;
use App\Models\User;

class RiskAlertPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, RiskAlert $riskAlert): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->role === 'admin' || $user->role === 'counselor';
    }

    public function update(User $user, RiskAlert $riskAlert): bool
    {
        return $user->role === 'admin' || $user->role === 'counselor';
    }

    public function delete(User $user, RiskAlert $riskAlert): bool
    {
        return $user->role === 'admin' || $user->role === 'counselor';
    }
}