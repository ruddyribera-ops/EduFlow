<?php

namespace App\Http\Requests;

use App\Models\Grade;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGradeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $grade = $this->route('grade');
        return $this->user() && $this->user()->can('update', $grade);
    }

    public function rules(): array
    {
        return [
            'student_id' => ['sometimes', 'uuid', 'exists:students,id'],
            'section_id' => ['sometimes', 'uuid', 'exists:sections,id'],
            'date' => ['sometimes', 'date'],
            'score' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'max_score' => ['sometimes', 'numeric', 'gt:0'],
            'type' => ['sometimes', 'string', Rule::in(['exam', 'homework', 'project', 'quiz', 'participation'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'score.min' => 'Score must be at least 0.',
            'score.max' => 'Score must not exceed 100.',
            'max_score.gt' => 'Maximum score must be greater than 0.',
            'type.in' => 'Type must be one of: exam, homework, project, quiz, participation.',
        ];
    }
}