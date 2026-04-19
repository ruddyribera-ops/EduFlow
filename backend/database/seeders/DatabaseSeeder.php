<?php

namespace Database\Seeders;

use App\Models\EnrollmentLead;
use App\Models\Guardian;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create admin user
        $admin = User::create([
            'id' => Str::uuid(),
            'name' => 'Admin User',
            'email' => 'admin@eduflow.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        // Create counselors
        $counselor1 = User::create([
            'id' => Str::uuid(),
            'name' => 'Sarah Johnson',
            'email' => 'sarah@eduflow.test',
            'password' => bcrypt('password'),
            'role' => 'counselor',
        ]);

        $counselor2 = User::create([
            'id' => Str::uuid(),
            'name' => 'Mike Williams',
            'email' => 'mike@eduflow.test',
            'password' => bcrypt('password'),
            'role' => 'counselor',
        ]);

        // Create teachers
        $teacher1 = User::create([
            'id' => Str::uuid(),
            'name' => 'Emily Chen',
            'email' => 'emily@eduflow.test',
            'password' => bcrypt('password'),
            'role' => 'teacher',
        ]);

        $teacher2 = User::create([
            'id' => Str::uuid(),
            'name' => 'David Park',
            'email' => 'david@eduflow.test',
            'password' => bcrypt('password'),
            'role' => 'teacher',
        ]);

        // Create sections
        $section1 = Section::create([
            'id' => Str::uuid(),
            'name' => 'Grade 5 - Math A',
            'grade_level' => '5th',
            'room' => 'B101',
            'counselor_id' => $counselor1->id,
            'semester' => 'fall',
        ]);

        $section2 = Section::create([
            'id' => Str::uuid(),
            'name' => 'Grade 5 - Science',
            'grade_level' => '5th',
            'room' => 'B102',
            'counselor_id' => $counselor1->id,
            'semester' => 'fall',
        ]);

        // Assign teachers via section_teacher pivot (composite PK, no auto-increment ID)
        \Illuminate\Support\Facades\DB::table('section_teacher')->insert([
            'section_id' => $section1->id,
            'teacher_id' => $teacher1->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        \Illuminate\Support\Facades\DB::table('section_teacher')->insert([
            'section_id' => $section2->id,
            'teacher_id' => $teacher2->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create students
        $student1 = Student::create([
            'id' => Str::uuid(),
            'first_name' => 'James',
            'last_name' => 'Wilson',
            'dob' => '2014-03-15',
            'enrollment_status' => 'enrolled',
            'grade_level' => '5th',
        ]);

        $student2 = Student::create([
            'id' => Str::uuid(),
            'first_name' => 'Emma',
            'last_name' => 'Thompson',
            'dob' => '2014-07-22',
            'enrollment_status' => 'enrolled',
            'grade_level' => '5th',
        ]);

        $student3 = Student::create([
            'id' => Str::uuid(),
            'first_name' => 'Michael',
            'last_name' => 'Brown',
            'dob' => '2014-01-10',
            'enrollment_status' => 'enrolled',
            'grade_level' => '5th',
        ]);

        // Attach students to sections via section_student pivot (composite PK - no auto-increment ID)
        \Illuminate\Support\Facades\DB::table('section_student')->insert([
            'section_id' => $section1->id,
            'student_id' => $student1->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        \Illuminate\Support\Facades\DB::table('section_student')->insert([
            'section_id' => $section1->id,
            'student_id' => $student2->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        \Illuminate\Support\Facades\DB::table('section_student')->insert([
            'section_id' => $section2->id,
            'student_id' => $student2->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        \Illuminate\Support\Facades\DB::table('section_student')->insert([
            'section_id' => $section2->id,
            'student_id' => $student3->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create guardians
        $guardian1 = Guardian::create([
            'id' => Str::uuid(),
            'first_name' => 'Lisa',
            'last_name' => 'Wilson',
            'email' => 'lisa.wilson@email.com',
            'phone' => '+1-555-0101',
            'communication_preference' => 'both',
            'is_primary' => true,
        ]);

        $guardian2 = Guardian::create([
            'id' => Str::uuid(),
            'first_name' => 'Robert',
            'last_name' => 'Wilson',
            'email' => 'robert.wilson@email.com',
            'phone' => '+1-555-0102',
            'communication_preference' => 'email_only',
            'is_primary' => false,
        ]);

        $guardian3 = Guardian::create([
            'id' => Str::uuid(),
            'first_name' => 'Susan',
            'last_name' => 'Thompson',
            'email' => 'susan.thompson@email.com',
            'phone' => '+1-555-0103',
            'communication_preference' => 'sms_only',
            'is_primary' => true,
        ]);

        // Create guardian-student relationships via household_members (composite PK)
        \Illuminate\Support\Facades\DB::table('household_members')->insert([
            'student_id' => $student1->id,
            'guardian_id' => $guardian1->id,
            'relationship_type' => 'Mother',
            'is_emergency_contact' => true,
            'can_pickup' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        \Illuminate\Support\Facades\DB::table('household_members')->insert([
            'student_id' => $student1->id,
            'guardian_id' => $guardian2->id,
            'relationship_type' => 'Father',
            'is_emergency_contact' => false,
            'can_pickup' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        \Illuminate\Support\Facades\DB::table('household_members')->insert([
            'student_id' => $student2->id,
            'guardian_id' => $guardian3->id,
            'relationship_type' => 'Mother',
            'is_emergency_contact' => true,
            'can_pickup' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create enrollment leads
        EnrollmentLead::create([
            'id' => Str::uuid(),
            'first_name' => 'Jennifer',
            'last_name' => 'Martinez',
            'email' => 'jennifer.martinez@email.com',
            'phone' => '+1-555-0201',
            'status' => 'inquiry',
            'source_campaign' => 'Google Ads - K-5',
            'assigned_counselor_id' => $counselor1->id,
        ]);

        EnrollmentLead::create([
            'id' => Str::uuid(),
            'first_name' => 'Christopher',
            'last_name' => 'Lee',
            'email' => 'chris.lee@email.com',
            'phone' => '+1-555-0202',
            'status' => 'tour_scheduled',
            'source_campaign' => 'Open House Event',
            'assigned_counselor_id' => $counselor1->id,
            'last_contacted_at' => now()->subDays(2),
        ]);

        EnrollmentLead::create([
            'id' => Str::uuid(),
            'first_name' => 'Amanda',
            'last_name' => 'Garcia',
            'email' => 'amanda.garcia@email.com',
            'phone' => '+1-555-0203',
            'status' => 'application_sent',
            'source_campaign' => 'Referral - Current Parent',
            'assigned_counselor_id' => $counselor2->id,
            'last_contacted_at' => now()->subDays(5),
        ]);

        EnrollmentLead::create([
            'id' => Str::uuid(),
            'first_name' => 'Daniel',
            'last_name' => 'Anderson',
            'email' => 'daniel.a@email.com',
            'status' => 'enrolled',
            'source_campaign' => 'Website Blog',
            'assigned_counselor_id' => $counselor2->id,
            'enrolled_at' => now()->subDays(10),
            'last_contacted_at' => now()->subDays(10),
        ]);

        EnrollmentLead::create([
            'id' => Str::uuid(),
            'first_name' => 'Michelle',
            'last_name' => 'Taylor',
            'email' => 'michelle.t@email.com',
            'phone' => '+1-555-0205',
            'status' => 'lost',
            'source_campaign' => 'Facebook Campaign',
            'notes' => 'Chose competitor school',
        ]);

        $this->command->info('Database seeded successfully!');
        $this->command->info('Test accounts:');
        $this->command->info('  Admin: admin@eduflow.test / password');
        $this->command->info('  Counselor: sarah@eduflow.test / password');
        $this->command->info('  Teacher: emily@eduflow.test / password');
    }
}