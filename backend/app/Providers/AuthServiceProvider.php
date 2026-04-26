<?php

namespace App\Providers;

use App\Models\Section;
use App\Models\User;
use App\Models\Student;
use App\Models\Guardian;
use App\Models\EnrollmentLead;
use App\Models\Attendance;
use App\Models\Grade;
use App\Models\Incident;
use App\Policies\SectionPolicy;
use App\Policies\UserPolicy;
use App\Policies\StudentPolicy;
use App\Policies\GuardianPolicy;
use App\Policies\LeadPolicy;
use App\Policies\RiskAlertPolicy;
use App\Policies\AttendancePolicy;
use App\Policies\GradePolicy;
use App\Policies\IncidentPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Section::class => SectionPolicy::class,
        User::class => UserPolicy::class,
        Student::class => StudentPolicy::class,
        Guardian::class => GuardianPolicy::class,
        EnrollmentLead::class => LeadPolicy::class,
        RiskAlert::class => RiskAlertPolicy::class,
        Attendance::class => AttendancePolicy::class,
        Grade::class => GradePolicy::class,
        Incident::class => IncidentPolicy::class,
    ];

    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->registerPolicies();
    }
}