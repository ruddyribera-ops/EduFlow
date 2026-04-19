<?php

namespace App\Enums;

enum CommunicationPreference: string
{
    case EMAIL_ONLY = 'email_only';
    case SMS_ONLY = 'sms_only';
    case BOTH = 'both';

    /**
     * Get all values as array for validation.
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Check if this preference includes email.
     */
    public function includesEmail(): bool
    {
        return match ($this) {
            self::EMAIL_ONLY, self::BOTH => true,
            self::SMS_ONLY => false,
        };
    }

    /**
     * Check if this preference includes SMS.
     */
    public function includesSms(): bool
    {
        return match ($this) {
            self::SMS_ONLY, self::BOTH => true,
            self::EMAIL_ONLY => false,
        };
    }

    /**
     * Get human-readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::EMAIL_ONLY => 'Email Only',
            self::SMS_ONLY => 'SMS Only',
            self::BOTH => 'Email and SMS',
        };
    }
}