<?php

namespace App\Http\Requests;

use App\Models\EnrollmentLead;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class UpdateLeadStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only admins and counselors can update lead status
        $user = $this->user();

        if (!$user) {
            return false;
        }

        return in_array($user->role, [User::ROLE_ADMIN, User::ROLE_COUNSELOR]);
    }

    public function rules(): array
    {
        return [
            'status' => [
                'required',
                'string',
                'in:' . implode(',', array_keys(EnrollmentLead::STATUSES)),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'status.required' => 'Lead status is required.',
            'status.in' => 'Invalid pipeline status. Allowed: ' . implode(', ', array_keys(EnrollmentLead::STATUSES)),
        ];
    }
}