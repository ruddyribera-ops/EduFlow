<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreIncidentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->authorize('create', \App\Models\Incident::class);
    }

    public function rules(): array
    {
        return [
            'student_id' => ['required', 'uuid', 'exists:students,id'],
            'type' => ['required', 'string', 'in:medical,behavioral,late_arrival,early_dismissal,visitor,other'],
            'severity' => ['required', 'string', 'in:low,medium,high'],
            'description' => ['nullable', 'string', 'max:5000'],
            'occurred_at' => ['required', 'date'],
            'notify_coordinator' => ['nullable', 'boolean'],
        ];
    }
}