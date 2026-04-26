<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportAttendance extends Command
{
    protected $signature = 'eduflow:import-attendance';
    protected $description = 'Import attendance from REGISTRO DE ASISTENCIAS LPS 2026 folders';

    private array $folderGradeMap = [
        'NIDITO - SUSI PAREDES' => ['grade' => 'NIDITO', 'level' => 'NIDITO'],
        'PRE KINDER - ADELA VARGAS' => ['grade' => 'PREKINDER', 'level' => 'PREKINDER'],
        'KINDER - GALIA FLORES' => ['grade' => 'KINDER', 'level' => 'KINDER'],
        '1RO PRIMARIA - YAMILE VELEZ' => ['grade' => '1st', 'level' => 'PRIMARIO'],
        '2DO PRIMARIA - AIDEE VERASTEGUI' => ['grade' => '2nd', 'level' => 'PRIMARIO'],
        '3RO PRIMARIA - NIDIA FLORES' => ['grade' => '3rd', 'level' => 'PRIMARIO'],
        '4TO PRIMARIA - CARMEN ROSA QUISPE' => ['grade' => '4th', 'level' => 'PRIMARIO'],
        '5TO PRIMARIA - MARIBEL FLORES' => ['grade' => '5th', 'level' => 'PRIMARIO'],
        '6TO PRIMARIA - ZULLY PACHECO' => ['grade' => '6th', 'level' => 'PRIMARIO'],
        '1RO SECUNDARIA - NOELIA ZAMBRANA' => ['grade' => '1st', 'level' => 'SECUNDARIO'],
        '2DO SECUNDARIA - GRETTY ALVAREZ' => ['grade' => '2nd', 'level' => 'SECUNDARIO'],
        '3RO SECUNDARIA - TANIA FLORES' => ['grade' => '3rd', 'level' => 'SECUNDARIO'],
        '4TO SECUNDARIA - GRETchen ZAMBRANA' => ['grade' => '4th', 'level' => 'SECUNDARIO'],
        '5TO SECUNDARIA - MELANI LANDA' => ['grade' => '5th', 'level' => 'SECUNDARIO'],
    ];

    private string $attendanceFolder = 'C:\Users\Windows\Downloads\EduFlow - Registros pedagógicos\REGISTRO DE ASISTENCIAS LPS 2026-20260426T204756Z-3-001\REGISTRO DE ASISTENCIAS LPS 2026';

    // Map of month names to month numbers
    private array $monthMap = [
        'FEBRERO' => 2,
        'MARZO' => 3,
        'ABRIL' => 4,
        'MAYO' => 5,
        'JUNIO' => 6,
        'JULIO' => 7,
        'AGOSTO' => 8,
        'SEPTIEMBRE' => 9,
        'OCTUBRE' => 10,
        'NOVIEMBRE' => 11,
    ];

    public function handle(): int
    {
        $this->info('=== EduFlow Attendance Import ===');
        $this->info("Source folder: {$this->attendanceFolder}\n");

        if (!is_dir($this->attendanceFolder)) {
            $this->error("Attendance folder not found: {$this->attendanceFolder}");
            return 1;
        }

        // === Step 1: Clear existing attendance records ===
        $this->info('[1/4] Clearing existing attendance records...');
        $beforeCount = DB::table('attendances')->count();
        DB::table('attendances')->delete();
        $this->info("  Cleared {$beforeCount} existing records\n");

        // === Step 2: Find all grade folders ===
        $this->info('[2/4] Scanning grade folders...');
        $gradeFolders = [];

        $items = scandir($this->attendanceFolder);
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;

            $fullPath = $this->attendanceFolder . '/' . $item;
            if (!is_dir($fullPath)) continue;

            // Check if this folder matches our grade map
            foreach ($this->folderGradeMap as $folderPattern => $gradeInfo) {
                $folderLower = strtolower($item);
                $patternLower = strtolower(explode(' - ', $folderPattern)[0]);

                if (strpos($folderLower, $patternLower) === 0) {
                    $gradeFolders[] = [
                        'path' => $fullPath,
                        'name' => $item,
                        'grade' => $gradeInfo['grade'],
                        'level' => $gradeInfo['level'],
                    ];
                    break;
                }
            }
        }

        $this->info("  Found " . count($gradeFolders) . " grade folders\n");

        // === Step 3: Process each grade folder ===
        $this->info('[3/4] Processing attendance files...');

        $totalInserted = 0;
        $totalSkipped = 0;
        $byGrade = [];

        foreach ($gradeFolders as $gradeFolder) {
            $folderPath = $gradeFolder['path'];
            $gradeLevel = $gradeFolder['grade'];

            $this->line("  Processing: {$gradeFolder['name']} ({$gradeLevel})");

            // Find the Excel file in this folder
            $excelFiles = glob($folderPath . '/*ASISTENCIA*.xlsx');
            if (empty($excelFiles)) {
                $this->line("    No ASISTENCIA Excel found - skipping");
                continue;
            }

            $excelPath = $excelFiles[0];

            try {
                $result = $this->processAttendanceExcel($excelPath, $gradeLevel);
                $totalInserted += $result['inserted'];
                $totalSkipped += $result['skipped'];

                if (!isset($byGrade[$gradeLevel])) {
                    $byGrade[$gradeLevel] = 0;
                }
                $byGrade[$gradeLevel] += $result['inserted'];
            } catch (\Exception $e) {
                $this->error("    Error processing {$excelPath}: " . $e->getMessage());
            }
        }

        $this->info("  Total inserted: {$totalInserted} attendance records");
        $this->info("  Total skipped: {$totalSkipped}\n");

        // === Step 4: Summary ===
        $this->info('[4/4] Summary...');
        $totalCount = DB::table('attendances')->count();
        $this->info("  Total attendances in DB: {$totalCount}");

        $this->info("\nAttendance records by grade:");
        ksort($byGrade);
        foreach ($byGrade as $grade => $count) {
            $this->info("  {$grade}: {$count}");
        }

        $this->info("\n=== Done ===");
        return 0;
    }

    private function processAttendanceExcel(string $excelPath, string $gradeLevel): array
    {
        $spreadsheet = IOFactory::load($excelPath);
        $sheets = $spreadsheet->getAllSheets();

        $inserted = 0;
        $skipped = 0;

        foreach ($sheets as $sheetIndex => $sheet) {
            $sheetName = $sheet->getTitle();
            $this->line("    Sheet: {$sheetName}");

            // Get month number from sheet name
            $monthNum = $this->monthMap[strtoupper($sheetName)] ?? null;
            if (!$monthNum) {
                $this->line("      Unknown month sheet - skipping");
                continue;
            }

            $rows = $sheet->toArray();

            // Row 8 (0-indexed) contains headers: N°, NOMBRES Y APELLIDOS, date columns
            // Row 9+ contains student data
            if (count($rows) < 9) {
                continue;
            }

            $headerRow = $rows[8];

            // Find date columns
            $dateColumns = [];
            foreach ($headerRow as $colIndex => $headerValue) {
                if ($colIndex <= 1) continue;

                $headerStr = trim((string) ($headerValue ?? ''));
                if (empty($headerStr)) continue;

                // Parse date in format DD/MM
                $dateValue = $this->parseDateFromHeader($headerStr, $monthNum);
                if ($dateValue) {
                    $dateColumns[$colIndex] = $dateValue;
                }
            }

            if (empty($dateColumns)) {
                $this->line("      No date columns found");
                continue;
            }

            $this->line("      Found " . count($dateColumns) . " date columns");

            // Process student rows (starting from row 9 = index 9)
            for ($rowIndex = 9; $rowIndex < count($rows); $rowIndex++) {
                $row = $rows[$rowIndex];

                // Column 1 = NOMBRES Y APELLIDOS
                $fullName = trim((string) ($row[1] ?? ''));
                if (empty($fullName) || is_numeric(substr($fullName, 0, 1))) {
                    continue;
                }

                // Find the student with their section
                $studentData = $this->findStudentWithSection($fullName, $gradeLevel);
                if (!$studentData) {
                    $skipped++;
                    continue;
                }

                $studentId = $studentData['id'];
                $sectionId = $studentData['section_id'];

                // Process each date column
                foreach ($dateColumns as $colIndex => $dateValue) {
                    $attendanceValue = trim((string) ($row[$colIndex] ?? ''));

                    // Skip empty cells or cells that don't have P/A/L/T/C
                    if (empty($attendanceValue)) {
                        continue;
                    }

                    // Map attendance value
                    $status = $this->mapAttendanceStatus($attendanceValue);
                    if (!$status) {
                        continue;
                    }

                    // Check if record already exists
                    $exists = DB::table('attendances')
                        ->where('student_id', $studentId)
                        ->where('date', $dateValue)
                        ->exists();

                    if ($exists) {
                        continue;
                    }

                    // Insert attendance record
                    DB::table('attendances')->insert([
                        'id' => (string) Str::uuid(),
                        'student_id' => $studentId,
                        'section_id' => $sectionId,
                        'date' => $dateValue,
                        'status' => $status,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $inserted++;
                }
            }
        }

        return ['inserted' => $inserted, 'skipped' => $skipped];
    }

    private function parseDateFromHeader(string $header, int $monthNum): ?string
    {
        // Date format: DD/MM (e.g., "02/02")
        if (preg_match('/^(\d{1,2})\/(\d{1,2})$/', $header, $matches)) {
            $day = (int)$matches[1];
            $month = (int)$matches[2];

            // Use year 2026
            $year = 2026;

            // Validate
            if ($day >= 1 && $day <= 31 && $month >= 1 && $month <= 12) {
                return sprintf('%04d-%02d-%02d', $year, $month, $day);
            }
        }

        return null;
    }

    private function findStudentWithSection(string $fullName, string $gradeLevel)
    {
        // Parse the full name - format is "LASTNAME1 LASTNAME2 FIRSTNAME"
        $parts = preg_split('/\s+/', trim($fullName));
        if (count($parts) < 2) {
            return null;
        }

        $firstName = array_pop($parts); // Last part is first name
        $lastName = implode(' ', $parts); // Everything else is last name

        // Try to find by first_name + last_name match
        $student = DB::table('students')
            ->where('first_name', Str::upper($firstName))
            ->where('last_name', 'LIKE', Str::upper($lastName) . '%')
            ->where('grade_level', $gradeLevel)
            ->first();

        if (!$student) {
            // Try just last name match
            $student = DB::table('students')
                ->where('last_name', 'LIKE', Str::upper($fullName) . '%')
                ->where('grade_level', $gradeLevel)
                ->first();
        }

        if (!$student) {
            return null;
        }

        // Get the section_id for this student from section_student
        $sectionStudent = DB::table('section_student')
            ->where('student_id', $student->id)
            ->first();

        if (!$sectionStudent) {
            // Try to get any section for this grade level
            $section = DB::table('sections')
                ->where('grade_level', $gradeLevel)
                ->first();

            $sectionId = $section ? $section->id : null;
        } else {
            $sectionId = $sectionStudent->section_id;
        }

        return [
            'id' => $student->id,
            'section_id' => $sectionId,
        ];
    }

    private function mapAttendanceStatus(string $value): ?string
    {
        $value = Str::upper(trim($value));

        // P = present, A = absent, L = license/excused, T = tardy, C = ?
        switch ($value) {
            case 'P':
                return 'present';
            case 'A':
                return 'absent';
            case 'L':
                return 'excused';  // L = licencia = excused absence
            case 'T':
                return 'tardy';
            case 'C':
                // C seems to be "Cita" or some other status - skip for now
                return null;
            default:
                return null;
        }
    }
}
