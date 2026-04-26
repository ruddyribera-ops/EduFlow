<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportParentMeetings extends Command
{
    protected $signature = 'eduflow:import-parent-meetings';
    protected $description = 'Import parent meetings from agenda Excel';

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
        $excelPath = 'C:\Users\Windows\Downloads\EduFlow - Registros pedagógicos\AGENDA REUNIONES API 2026-20260426T204921Z-3-001\AGENDA REUNIONES API 2026\REUNIONES 1 TRIMESTRE\AGENDA SE SEGUIMIENTO API 1 TRIMESTRE.xlsx';

        $this->info('=== EduFlow Parent Meetings Import ===');
        $this->info("Source: {$excelPath}\n");

        if (!file_exists($excelPath)) {
            $this->error("Excel file not found: {$excelPath}");
            return 1;
        }

        // === Step 1: Clear existing parent meetings ===
        $this->info('[1/4] Clearing existing parent meetings...');
        $beforeCount = DB::table('parent_meetings')->count();
        DB::table('parent_meetings')->delete();
        $this->info("  Cleared {$beforeCount} existing records\n");

        // === Step 2: Read Excel ===
        $this->info('[2/4] Reading Excel file...');
        try {
            $spreadsheet = IOFactory::load($excelPath);
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray();
        } catch (\Exception $e) {
            $this->error("Failed to read Excel: " . $e->getMessage());
            return 1;
        }

        $this->info("  Loaded " . count($rows) . " rows\n");

        // Data starts at row 7 (0-indexed row 6 is the header)
        $headerRow = 6;
        $dataRows = array_slice($rows, $headerRow + 1);

        $this->info("  Header at row {$headerRow}, " . count($dataRows) . " data rows\n");

        // === Step 3: Parse and insert meetings ===
        $this->info('[3/4] Processing meetings...');

        $inserted = 0;
        $skipped = 0;

        foreach ($dataRows as $index => $row) {
            $rowNum = $headerRow + 2 + $index;

            // Columns (based on debug output):
            // 1=FECHA, 2=NOMBRE DEL ESTUDIANTE, 3=CURSO, 4=TUTORA,
            // 5=DÍA y HORA, 6=CON QUIÉN, 7=MODALIDAD, 8=CONFIRMACIÓN, 9=OBSERVACIÓN
            $fecha = trim((string) ($row[1] ?? ''));
            $nombreEstudiante = trim((string) ($row[2] ?? ''));
            $cursoCodigo = trim((string) ($row[3] ?? ''));
            $tutora = trim((string) ($row[4] ?? ''));
            $diaHora = trim((string) ($row[5] ?? ''));
            $conQuien = trim((string) ($row[6] ?? ''));
            $modalidad = trim((string) ($row[7] ?? ''));
            $confirmacion = trim((string) ($row[8] ?? ''));
            $observacion = trim((string) ($row[9] ?? ''));

            // Skip if essential fields are empty
            if (empty($nombreEstudiante) || empty($fecha)) {
                $skipped++;
                continue;
            }

            // Parse date (format: d/m/y like "18/03/26")
            $meetingDate = $this->parseDate($fecha);
            if (!$meetingDate) {
                $this->line("  Row {$rowNum}: Could not parse date '{$fecha}' - skipping");
                $skipped++;
                continue;
            }

            // Map grade code
            $gradeInfo = $this->gradeMap[$cursoCodigo] ?? null;
            if (!$gradeInfo) {
                $this->line("  Row {$rowNum}: Unknown grade code '{$cursoCodigo}' for {$nombreEstudiante} - skipping");
                $skipped++;
                continue;
            }
            $gradeLevel = $gradeInfo['grade'];

            // Normalize student name for matching
            $normalizedName = $this->normalizeName($nombreEstudiante);

            // Find student
            $student = $this->findStudent($normalizedName, $gradeLevel);

            if (!$student) {
                // Try to find by just the last name part
                $parts = explode(' ', $normalizedName);
                if (count($parts) >= 2) {
                    $lastName = array_pop($parts);
                    $student = $this->findStudentByLastName($lastName, $gradeLevel);
                }
            }

            if (!$student) {
                $this->line("  Row {$rowNum}: Student not found: {$nombreEstudiante} ({$gradeLevel}) - skipping");
                $skipped++;
                continue;
            }

            // Normalize modality
            $modality = $this->normalizeModality($modalidad);

            // Normalize confirmation
            $confirmation = $this->normalizeConfirmation($confirmacion);

            // Insert meeting
            DB::table('parent_meetings')->insert([
                'id' => (string) Str::uuid(),
                'student_id' => $student->id,
                'meeting_date' => $meetingDate,
                'tutor_name' => !empty($tutora) ? $tutora : null,
                'day_time' => !empty($diaHora) ? $diaHora : null,
                'attendees' => !empty($conQuien) ? $conQuien : null,
                'modality' => $modality,
                'confirmation' => $confirmation,
                'observation' => !empty($observacion) ? $observacion : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $inserted++;
        }

        $this->info("  Inserted {$inserted} meetings");
        if ($skipped > 0) {
            $this->warn("  Skipped {$skipped} rows");
        }

        // === Step 4: Summary ===
        $this->info('[4/4] Summary...');
        $totalCount = DB::table('parent_meetings')->count();
        $this->info("  Total parent meetings in DB: {$totalCount}");

        $this->info("\nMeetings by grade:");
        $byGrade = DB::table('parent_meetings')
            ->join('students', 'parent_meetings.student_id', '=', 'students.id')
            ->select('students.grade_level', DB::raw('count(*) as count'))
            ->groupBy('students.grade_level')
            ->get();

        foreach ($byGrade as $row) {
            $this->info("  {$row->grade_level}: {$row->count}");
        }

        $this->info("\n=== Done ===");
        return 0;
    }

    private function parseDate(string $dateStr): ?string
    {
        if (empty($dateStr)) {
            return null;
        }

        // Format: d/m/y like "18/03/26"
        $date = \DateTime::createFromFormat('d/m/y', $dateStr);
        if ($date !== false) {
            return $date->format('Y-m-d');
        }

        // Try other formats
        $formats = ['d/m/Y', 'd-m-Y', 'Y-m-d', 'm/d/Y'];
        foreach ($formats as $format) {
            $date = \DateTime::createFromFormat($format, $dateStr);
            if ($date !== false) {
                return $date->format('Y-m-d');
            }
        }

        return null;
    }

    private function normalizeName(string $name): string
    {
        // Remove extra spaces and convert to uppercase
        $name = preg_replace('/\s+/', ' ', trim($name));
        return Str::upper($name);
    }

    private function findStudent(string $normalizedFullName, string $gradeLevel)
    {
        // Try to match by full name
        $parts = explode(' ', $normalizedFullName);
        if (count($parts) < 2) {
            return null;
        }

        $firstName = $parts[0];
        $lastName = implode(' ', array_slice($parts, 1));

        return DB::table('students')
            ->where('first_name', Str::upper($firstName))
            ->where('last_name', 'LIKE', Str::upper($lastName) . '%')
            ->where('grade_level', $gradeLevel)
            ->first();
    }

    private function findStudentByLastName(string $lastName, string $gradeLevel)
    {
        return DB::table('students')
            ->where('last_name', 'LIKE', Str::upper($lastName) . '%')
            ->where('grade_level', $gradeLevel)
            ->first();
    }

    private function normalizeModality(string $modality): ?string
    {
        $modality = Str::upper(trim($modality));
        if (strpos($modality, 'VIRTUAL') !== false || strpos($modality, 'VIDEO') !== false) {
            return 'VIRTUAL';
        }
        if (strpos($modality, 'PRESENCIAL') !== false || strpos($modality, 'PRESCIAL') !== false) {
            return 'PRESENCIAL';
        }
        return !empty($modality) ? $modality : null;
    }

    private function normalizeConfirmation(string $confirmation): ?string
    {
        $confirmation = Str::upper(trim($confirmation));
        if ($confirmation === 'SI' || $confirmation === 'SÍ' || $confirmation === 'YES') {
            return 'SI';
        }
        if ($confirmation === 'NO') {
            return 'NO';
        }
        return !empty($confirmation) ? $confirmation : null;
    }
}
