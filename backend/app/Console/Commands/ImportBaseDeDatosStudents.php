<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportBaseDeDatosStudents extends Command
{
    protected $signature = 'eduflow:import-base-de-datos';
    protected $description = 'Import students from BASE DE DATOS ESTUDIANTES LPS 2026.xlsx';

    private array $gradeMap = [
        'ND' => ['grade' => 'NIDITO', 'level' => 'NIDITO'],
        'PK' => ['grade' => 'PREKINDER', 'level' => 'PREKINDER'],
        'K'  => ['grade' => 'KINDER', 'level' => 'KINDER'],
        '1P' => ['grade' => '1st', 'level' => 'PRIMARIO'],
        '2P' => ['grade' => '2nd', 'level' => 'PRIMARIO'],
        '3P' => ['grade' => '3rd', 'level' => 'PRIMARIO'],
        '4P' => ['grade' => '4th', 'level' => 'PRIMARIO'],
        '5P' => ['grade' => '5th', 'level' => 'PRIMARIO'],
        '6P' => ['grade' => '6th', 'level' => 'PRIMARIO'],
        '1S' => ['grade' => '1st', 'level' => 'SECUNDARIO'],
        '2S' => ['grade' => '2nd', 'level' => 'SECUNDARIO'],
        '3S' => ['grade' => '3rd', 'level' => 'SECUNDARIO'],
        '4S' => ['grade' => '4th', 'level' => 'SECUNDARIO'],
        '5S' => ['grade' => '5th', 'level' => 'SECUNDARIO'],
    ];

    public function handle(): int
    {
        $excelPath = 'C:\Users\Windows\Downloads\EduFlow - Registros pedagógicos\BASE DE DATOS ESTUDIANTES LPS 2026.xlsx';

        $this->info('=== EduFlow BASE DE DATOS Student Import ===');
        $this->info("Source: {$excelPath}\n");

        if (!file_exists($excelPath)) {
            $this->error("Excel file not found: {$excelPath}");
            return 1;
        }

        // === Step 1: Read Excel ===
        $this->info('[1/7] Reading Excel file...');
        try {
            $spreadsheet = IOFactory::load($excelPath);
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray();
        } catch (\Exception $e) {
            $this->error("Failed to read Excel: " . $e->getMessage());
            return 1;
        }

        $this->info("  Loaded " . count($rows) . " rows\n");

        // Skip header row (row 0)
        $dataRows = array_slice($rows, 1);
        $this->info("  " . count($dataRows) . " data rows found\n");

        // === Step 2: Clear existing data ===
        $this->info('[2/7] Clearing existing student data...');

        // Get counts before deletion
        $studentsBefore = DB::table('students')->count();
        $guardiansBefore = DB::table('guardians')->count();
        $householdBefore = DB::table('household_members')->count();

        $this->info("  Before: {$studentsBefore} students, {$guardiansBefore} guardians, {$householdBefore} household_members");

        // Delete in correct order (foreign key constraints)
        DB::table('household_members')->delete();
        DB::table('students')->delete();
        DB::table('guardians')->delete();

        // Reset sequences
        DB::statement('TRUNCATE TABLE household_members RESTART IDENTITY CASCADE');
        DB::statement('TRUNCATE TABLE students RESTART IDENTITY CASCADE');
        DB::statement('TRUNCATE TABLE guardians RESTART IDENTITY CASCADE');

        $this->info("  Cleared all existing student/guardian data\n");

        // === Step 3: Parse and collect data from Excel ===
        $this->info('[3/7] Parsing Excel rows...');

        $parsedRows = [];
        $skippedRows = 0;

        foreach ($dataRows as $index => $row) {
            $rowNum = $index + 2;

            // Skip empty rows
            if (empty($row[0]) && empty($row[1])) {
                continue;
            }

            // Map columns: 0=NOMBRE, 1=APELLIDO PARTENO, 2=APELLIDO MATERNO, 3=GRADO/CURSO, 4=SECCION, 5=CORREO DE PADRES
            $nombre = trim((string) ($row[0] ?? ''));
            $apellidoPaterno = trim((string) ($row[1] ?? ''));
            $apellidoMaterno = trim((string) ($row[2] ?? ''));
            $gradoCodigo = trim((string) ($row[3] ?? ''));
            $seccion = trim((string) ($row[4] ?? ''));
            $correoPadres = trim((string) ($row[5] ?? ''));

            // Skip if essential fields are empty
            if (empty($nombre) || empty($apellidoPaterno)) {
                $skippedRows++;
                continue;
            }

            // Map grade code
            $gradeInfo = $this->gradeMap[$gradoCodigo] ?? null;
            if (!$gradeInfo) {
                $this->line("  Row {$rowNum}: Unknown grade code '{$gradoCodigo}' for {$nombre} {$apellidoPaterno} - skipping");
                $skippedRows++;
                continue;
            }

            $parsedRows[] = [
                'nombre' => $nombre,
                'apellido_paterno' => $apellidoPaterno,
                'apellido_materno' => $apellidoMaterno,
                'grado_codigo' => $gradoCodigo,
                'seccion' => $seccion,
                'correo_padres' => $correoPadres,
                'grade_level' => $gradeInfo['grade'],
                'level' => $gradeInfo['level'],
            ];
        }

        $this->info("  Parsed " . count($parsedRows) . " valid rows");
        if ($skippedRows > 0) {
            $this->warn("  Skipped {$skippedRows} rows");
        }

        // === Step 4: Create guardians (handle duplicate emails by checking existing) ===
        $this->info('[4/7] Creating guardians...');

        // Track guardians by unique email to avoid duplicate key violations
        $guardianByEmail = []; // email => guardian_id

        foreach ($parsedRows as $row) {
            $email = !empty($row['correo_padres']) ? strtolower($row['correo_padres']) : null;

            if ($email && isset($guardianByEmail[$email])) {
                // Already have a guardian with this email, skip
                continue;
            }

            $guardianId = (string) Str::uuid();

            DB::table('guardians')->insert([
                'id' => $guardianId,
                'first_name' => $row['apellido_paterno'],
                'last_name' => $row['apellido_materno'],
                'email' => $email,
                'phone' => null,
                'passwordless_login_token' => null,
                'passwordless_token_expires_at' => null,
                'communication_preference' => 'both',
                'household_id' => null,
                'is_primary' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($email) {
                $guardianByEmail[$email] = $guardianId;
            }
        }

        $guardianCount = DB::table('guardians')->count();
        $this->info("  Created {$guardianCount} guardians\n");

        // === Step 5: Create students and link to guardians ===
        $this->info('[5/7] Creating students and linking to guardians...');

        $gradeCounts = [];

        foreach ($parsedRows as $row) {
            $studentId = (string) Str::uuid();
            $firstName = $row['nombre'];
            $lastName = $row['apellido_paterno'] . ' ' . $row['apellido_materno'];
            $gradeLevel = $row['grade_level'];
            $level = $row['level'];
            $email = !empty($row['correo_padres']) ? strtolower($row['correo_padres']) : null;

            // Create student
            DB::table('students')->insert([
                'id' => $studentId,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'grade_level' => $gradeLevel,
                'enrollment_status' => 'enrolled',
                'dob' => null,
                'household_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Get guardian by email
            $guardianId = $email && isset($guardianByEmail[$email]) ? $guardianByEmail[$email] : null;

            if ($guardianId) {
                // Link student to guardian
                DB::table('household_members')->insert([
                    'student_id' => $studentId,
                    'guardian_id' => $guardianId,
                    'relationship_type' => 'parent',
                    'is_emergency_contact' => true,
                    'can_pickup' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Track by grade
            $key = $level . '-' . $gradeLevel;
            if (!isset($gradeCounts[$key])) {
                $gradeCounts[$key] = 0;
            }
            $gradeCounts[$key]++;
        }

        $studentCount = DB::table('students')->count();
        $householdCount = DB::table('household_members')->count();
        $this->info("  Created {$studentCount} students with {$householdCount} guardian links\n");

        // === Step 6: Clear sections and recreate ===
        $this->info('[6/7] Clearing and recreating sections...');
        DB::table('section_student')->delete();
        DB::table('section_teacher')->delete();
        DB::table('sections')->delete();

        $sectionsData = [
            'NIDITO' => ['name' => 'NIDITO', 'grade' => 'NIDITO'],
            'PREKINDER' => ['name' => 'PREKINDER', 'grade' => 'PREKINDER'],
            'KINDER' => ['name' => 'KINDER', 'grade' => 'KINDER'],
            'PRIMARIO-1st' => ['name' => '1RO PRIMARIA', 'grade' => '1st'],
            'PRIMARIO-2nd' => ['name' => '2DO PRIMARIA', 'grade' => '2nd'],
            'PRIMARIO-3rd' => ['name' => '3RO PRIMARIA', 'grade' => '3rd'],
            'PRIMARIO-4th' => ['name' => '4TO PRIMARIA', 'grade' => '4th'],
            'PRIMARIO-5th' => ['name' => '5TO PRIMARIA', 'grade' => '5th'],
            'PRIMARIO-6th' => ['name' => '6TO PRIMARIA', 'grade' => '6th'],
            'SECUNDARIO-1st' => ['name' => '1RO SECUNDARIA', 'grade' => '1st'],
            'SECUNDARIO-2nd' => ['name' => '2DO SECUNDARIA', 'grade' => '2nd'],
            'SECUNDARIO-3rd' => ['name' => '3RO SECUNDARIA', 'grade' => '3rd'],
            'SECUNDARIO-4th' => ['name' => '4TO SECUNDARIA', 'grade' => '4th'],
            'SECUNDARIO-5th' => ['name' => '5TO SECUNDARIA', 'grade' => '5th'],
        ];

        $createdSections = [];
        foreach ($sectionsData as $key => $sectionData) {
            $sectionId = (string) Str::uuid();
            DB::table('sections')->insert([
                'id' => $sectionId,
                'name' => $sectionData['name'],
                'grade_level' => $sectionData['grade'],
                'room' => null,
                'semester' => 'Spring 2026',
                'counselor_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $createdSections[$key] = $sectionId;
        }

        $sectionCount = DB::table('sections')->count();
        $this->info("  Created {$sectionCount} sections\n");

        // === Step 7: Assign students to sections ===
        $this->info('[7/7] Assigning students to sections...');

        $students = DB::table('students')->get();

        foreach ($students as $student) {
            $gradeLevel = $student->grade_level;
            $level = $this->getLevelFromGrade($gradeLevel);
            $key = $level . '-' . $gradeLevel;
            $sectionId = $createdSections[$key] ?? null;

            if ($sectionId) {
                DB::table('section_student')->insert([
                    'section_id' => $sectionId,
                    'student_id' => $student->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $sectionStudentCount = DB::table('section_student')->count();

        // === Final Summary ===
        $this->info('=== Import Complete ===');
        $this->info("Total students imported: {$studentCount}");
        $this->info("Total guardians created: {$guardianCount}");
        $this->info("Total sections created: {$sectionCount}");
        $this->info("Total section-student links: {$sectionStudentCount}");

        $this->info("\nStudents by grade:");
        ksort($gradeCounts);
        foreach ($gradeCounts as $key => $count) {
            $this->info("  {$key}: {$count}");
        }

        $this->info("\n=== Done ===");
        return 0;
    }

    private function getLevelFromGrade(string $grade): string
    {
        if (in_array($grade, ['NIDITO', 'PREKINDER', 'KINDER'])) {
            return $grade;
        }
        if (in_array($grade, ['1st', '2nd', '3rd', '4th', '5th', '6th'])) {
            return 'PRIMARIO';
        }
        if (in_array($grade, ['1st', '2nd', '3rd', '4th', '5th'])) {
            return 'SECUNDARIO';
        }
        return 'PRIMARIO';
    }
}
