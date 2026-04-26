<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportStudentAccounts extends Command
{
    protected $signature = 'eduflow:import-student-accounts';
    protected $description = 'Import student accounts from LISTA DE ESTUDIANTES 2026.xlsx';

    private array $sheetGradeMap = [
        'NIDITO' => ['grade' => 'NIDITO', 'level' => 'NIDITO'],
        'PREKINDER' => ['grade' => 'PREKINDER', 'level' => 'PREKINDER'],
        'KINDER' => ['grade' => 'KINDER', 'level' => 'KINDER'],
        '1RO PRIMARIA' => ['grade' => '1st', 'level' => 'PRIMARIO'],
        '2DO DE PRIMARIA' => ['grade' => '2nd', 'level' => 'PRIMARIO'],
        '3RO DE PRIMARIA' => ['grade' => '3rd', 'level' => 'PRIMARIO'],
        '4TO DE PRIMARIA' => ['grade' => '4th', 'level' => 'PRIMARIO'],
        '5TO DE PRIMARIA' => ['grade' => '5th', 'level' => 'PRIMARIO'],
        '6TO  DE PRIMARIA' => ['grade' => '6th', 'level' => 'PRIMARIO'],
        '1RO SEC' => ['grade' => '1st', 'level' => 'SECUNDARIO'],
        '2DO SEC' => ['grade' => '2nd', 'level' => 'SECUNDARIO'],
        '3RO SEC' => ['grade' => '3rd', 'level' => 'SECUNDARIO'],
        '4TO SEC' => ['grade' => '4th', 'level' => 'SECUNDARIO'],
        '5TO SEC' => ['grade' => '5th', 'level' => 'SECUNDARIO'],
    ];

    public function handle(): int
    {
        $excelPath = 'C:\Users\Windows\Downloads\EduFlow - Registros pedagógicos\LISTA DE ESTUDIANTES 2026-20260426T204759Z-3-001\LISTA DE ESTUDIANTES 2026\LISTA DE ESTUDIANTES LPS 2026.xlsx';

        $this->info('=== EduFlow Student Accounts Import ===');
        $this->info("Source: {$excelPath}\n");

        if (!file_exists($excelPath)) {
            $this->error("Excel file not found: {$excelPath}");
            return 1;
        }

        // === Step 1: Clear existing student users ===
        $this->info('[1/4] Clearing existing student users...');
        $beforeCount = DB::table('users')
            ->where('role', 'student')
            ->count();
        DB::table('users')
            ->where('role', 'student')
            ->delete();
        $this->info("  Cleared {$beforeCount} existing student users\n");

        // === Step 2: Read Excel (multi-sheet) ===
        $this->info('[2/4] Reading Excel file...');
        try {
            $spreadsheet = IOFactory::load($excelPath);
        } catch (\Exception $e) {
            $this->error("Failed to read Excel: " . $e->getMessage());
            return 1;
        }

        $sheetNames = $spreadsheet->getSheetNames();
        $this->info("  Found " . count($sheetNames) . " sheets: " . implode(', ', $sheetNames) . "\n");

        // === Step 3: Process each sheet ===
        $this->info('[3/4] Processing sheets...');

        $inserted = 0;
        $skipped = 0;
        $skippedInvalidEmail = 0;
        $notFound = [];
        $byGrade = [];
        $errors = [];

        foreach ($sheetNames as $sheetName) {
            $gradeInfo = $this->sheetGradeMap[$sheetName] ?? null;
            if (!$gradeInfo) {
                $this->line("  Sheet '{$sheetName}': Unknown grade - skipping");
                $skipped++;
                continue;
            }

            $gradeLevel = $gradeInfo['grade'];
            $sheet = $spreadsheet->getSheetByName($sheetName);
            $rows = $sheet->toArray();

            $this->line("  Sheet '{$sheetName}' ({$gradeLevel}): " . count($rows) . " rows");

            // Skip header row (row 0)
            $dataRows = array_slice($rows, 1);

            foreach ($dataRows as $rowIndex => $row) {
                // Columns (from debug):
                // 0 = row number (skip)
                // 1 = APELLIDO (full name)
                // 2 = EMAIL
                // 3 = CONTRASEÑA (password hash)
                $rowNum = $row[0] ?? '';
                $apellido = trim((string) ($row[1] ?? ''));
                $email = trim((string) ($row[2] ?? ''));
                $passwordHash = trim((string) ($row[3] ?? ''));

                // Skip empty rows
                if (empty($apellido) || empty($email)) {
                    continue;
                }

                // Skip rows where APELLIDO is just a number or month name or other non-name
                if (is_numeric($apellido) || strlen($apellido) < 3) {
                    continue;
                }

                // Skip rows with obviously invalid emails (no @ sign)
                if (strpos($email, '@') === false) {
                    $skippedInvalidEmail++;
                    continue;
                }

                // Skip rows where email looks like a name or grade (contains 'go getter' or similar)
                if (preg_match('/go\s*getter/i', $email) || preg_match('/^[a-z]\s+[a-z]/i', $email)) {
                    $skippedInvalidEmail++;
                    continue;
                }

                // Split APELLIDO: last word is first_name, rest is last_name
                $parts = preg_split('/\s+/', $apellido);
                if (count($parts) < 2) {
                    $skipped++;
                    continue;
                }

                $firstName = array_pop($parts);
                $lastName = implode(' ', $parts);

                // Find student by first_name + last_name + grade_level
                $student = DB::table('students')
                    ->where('first_name', Str::upper($firstName))
                    ->where('last_name', 'LIKE', Str::upper($lastName) . '%')
                    ->where('grade_level', $gradeLevel)
                    ->first();

                if (!$student) {
                    // Try matching just the last name as-is
                    $student = DB::table('students')
                        ->whereRaw('UPPER(last_name) LIKE ?', [Str::upper($apellido) . '%'])
                        ->where('grade_level', $gradeLevel)
                        ->first();
                }

                if (!$student) {
                    $notFoundKey = "{$firstName} {$lastName} ({$gradeLevel})";
                    if (!isset($notFound[$notFoundKey])) {
                        $notFound[$notFoundKey] = 1;
                    }
                    $skipped++;
                    continue;
                }

                // Check for duplicate email
                $existingUser = DB::table('users')->where('email', strtolower($email))->first();
                if ($existingUser) {
                    $skipped++;
                    continue;
                }

                // Create user - password is stored as-is (bcrypt hash from Excel)
                $fullName = $firstName . ' ' . $lastName;
                try {
                    DB::table('users')->insert([
                        'id' => (string) Str::uuid(),
                        'name' => Str::upper($fullName),
                        'email' => strtolower($email),
                        'password' => $passwordHash,
                        'role' => 'student',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } catch (\Exception $e) {
                    $errors[] = "Error inserting {$email}: " . $e->getMessage();
                    continue;
                }

                if (!isset($byGrade[$gradeLevel])) {
                    $byGrade[$gradeLevel] = 0;
                }
                $byGrade[$gradeLevel]++;
                $inserted++;
            }
        }

        $this->info("  Inserted {$inserted} student accounts");
        if ($skipped > 0) {
            $this->warn("  Skipped {$skipped} rows (not matched to students or duplicate)");
        }
        if ($skippedInvalidEmail > 0) {
            $this->warn("  Skipped {$skippedInvalidEmail} rows with invalid email format");
        }

        // === Step 4: Summary ===
        $this->info('[4/4] Summary...');
        $totalCount = DB::table('users')->where('role', 'student')->count();
        $this->info("  Total student accounts in DB: {$totalCount}");

        $this->info("\nAccounts by grade:");
        ksort($byGrade);
        foreach ($byGrade as $grade => $count) {
            $this->info("  {$grade}: {$count}");
        }

        if (count($errors) > 0 && count($errors) <= 5) {
            $this->warn("\nErrors encountered:");
            foreach ($errors as $error) {
                $this->warn("  - {$error}");
            }
        }

        $this->info("\n=== Done ===");
        return 0;
    }
}
