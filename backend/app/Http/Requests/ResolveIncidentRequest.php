<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResolveIncidentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->authorize('resolve', $this->route('incident'));
    }

    public function rules(): array
    {
        return [
            'resolved_at' => ['required', 'date'],
            'resolution_notes' => ['nullable', 'string', 'max:5000'],
            'notify_coordinator' => ['nullable', 'boolean'],
        ];
    }
}