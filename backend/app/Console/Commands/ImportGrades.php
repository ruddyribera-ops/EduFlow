<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportGrades extends Command
{
    protected $signature = 'eduflow:import-grades';
    protected $description = 'Import 1st trimester grades from pedagogic registration Excel files';

    private string $primarioFolder = 'C:\Users\Windows\Downloads\EduFlow - Registros pedagógicos\NIVEL PRIMARIO-20260426T142845Z-3-001\NIVEL PRIMARIO';
    private string $secundarioFolder = 'C:\Users\Windows\Downloads\EduFlow - Registros pedagógicos\NIVEL SECUNDARIO-20260426T142846Z-3-001\NIVEL SECUNDARIO';

    // Subject name mapping to normalized names
    private array $subjectMap = [
        'LENGUAJE' => 'Lenguaje',
        'MATEMÁTICAS' => 'Matemáticas',
        'MATEMATICAS' => 'Matemáticas',
        'CIENCIAS NATURALES' => 'Cs. Naturales',
        'CS. NATURALES' => 'Cs. Naturales',
        'SCIENCE' => 'Cs. Naturales',
        'SOCIALES' => 'Sociales',
        'ED. FÍSICA' => 'Ed. Física',
        'ED. FISICA' => 'Ed. Física',
        'MÚSICA' => 'Música',
        'MUSICA' => 'Música',
        'ARTES' => 'Artes',
        'ARTES PLÁSTICAS' => 'Artes',
        'ARTES PLASTICAS' => 'Artes',
        'TECNOLOGÍA' => 'Tecnología',
        'TECNOLOGIA' => 'Tecnología',
        'INGLÉS' => 'Inglés',
        'INGLES' => 'Inglés',
        'VALORES' => 'Valores',
        'PORTUGUÉS' => 'Portugués',
        'PORTUGUES' => 'Portugués',
        'QUÍMICA' => 'Química',
        'QUIMICA' => 'Química',
        'FÍSICA' => 'Física',
        'FISICA' => 'Física',
        'PSI - MET. INV.' => 'PSI - Met. Inv.',
        'PSI-MET. INV.' => 'PSI - Met. Inv.',
    ];

    // Sheets to skip (not actual subjects)
    private array $skipSheets = [
        'ASISTENCIAS',
        'PROMEDIO LENGUAS',
        '1ER TRIM',
        '1ER TRIMESTRE',
        'CUADRO DE HONOR',
        'BOLETINES 2026',
        'BOLENTINES 2026',
    ];

    // Grade file mapping
    private array $gradeFileMap = [
        '1RO PRIMARIA' => ['grade' => '1st', 'level' => 'PRIMARIO'],
        '2DO PRIMARIA' => ['grade' => '2nd', 'level' => 'PRIMARIO'],
        '3RO PRIMARIA' => ['grade' => '3rd', 'level' => 'PRIMARIO'],
        '4TO PRIMARIA' => ['grade' => '4th', 'level' => 'PRIMARIO'],
        '5TO PRIMARIA' => ['grade' => '5th', 'level' => 'PRIMARIO'],
        '6TO PRIMARIA' => ['grade' => '6th', 'level' => 'PRIMARIO'],
        '1RO SECUNDARIA' => ['grade' => '1st', 'level' => 'SECUNDARIO'],
        '2DO SECUNDARIA' => ['grade' => '2nd', 'level' => 'SECUNDARIO'],
        '3RO SECUNDARIA' => ['grade' => '3rd', 'level' => 'SECUNDARIO'],
        '4TO SECUNDARIA' => ['grade' => '4th', 'level' => 'SECUNDARIO'],
        '5TO SECUNDARIA' => ['grade' => '5th', 'level' => 'SECUNDARIO'],
    ];

    public function handle(): int
    {
        $this->info('=== EduFlow 1st Trimester Grades Import ===');

        // Check folders exist
        if (!is_dir($this->primarioFolder)) {
            $this->error("Primario folder not found: {$this->primarioFolder}");
            return 1;
        }
        if (!is_dir($this->secundarioFolder)) {
            $this->error("Secundario folder not found: {$this->secundarioFolder}");
            return 1;
        }

        // === Step 1: Clear existing grades ===
        $this->info('[1/4] Clearing existing grades...');
        $beforeCount = DB::table('grades')->count();
        DB::table('grades')->delete();
        $this->info("  Cleared {$beforeCount} existing grades\n");

        // === Step 2: Process both folders ===
        $this->info('[2/4] Processing grade files...');

        $totalInserted = 0;
        $totalSkipped = 0;
        $byGrade = [];
        $bySubject = [];

        // Process PRIMARIO
        $this->line("  Processing PRIMARIO folder...");
        $result = $this->processGradeFolder($this->primarioFolder);
        $totalInserted += $result['inserted'];
        $totalSkipped += $result['skipped'];
        foreach ($result['byGrade'] as $g => $c) {
            $byGrade[$g] = ($byGrade[$g] ?? 0) + $c;
        }
        foreach ($result['bySubject'] as $s => $c) {
            $bySubject[$s] = ($bySubject[$s] ?? 0) + $c;
        }

        // Process SECUNDARIO
        $this->line("  Processing SECUNDARIO folder...");
        $result = $this->processGradeFolder($this->secundarioFolder);
        $totalInserted += $result['inserted'];
        $totalSkipped += $result['skipped'];
        foreach ($result['byGrade'] as $g => $c) {
            $byGrade[$g] = ($byGrade[$g] ?? 0) + $c;
        }
        foreach ($result['bySubject'] as $s => $c) {
            $bySubject[$s] = ($bySubject[$s] ?? 0) + $c;
        }

        // === Step 3: Summary ===
        $this->info('[3/4] Summary...');
        $this->info("  Total inserted: {$totalInserted} grade records");
        $this->info("  Total skipped: {$totalSkipped}\n");

        // === Step 4: Final report ===
        $this->info('[4/4] Final Report...');
        $totalCount = DB::table('grades')->count();
        $this->info("  Total grades in DB: {$totalCount}");

        $this->info("\nGrades by grade:");
        ksort($byGrade);
        foreach ($byGrade as $grade => $count) {
            $this->info("  {$grade}: {$count}");
        }

        $this->info("\nGrades by subject:");
        ksort($bySubject);
        foreach ($bySubject as $subject => $count) {
            $this->info("  {$subject}: {$count}");
        }

        $this->info("\n=== Done ===");
        return 0;
    }

    private function processGradeFolder(string $folderPath): array
    {
        $files = glob($folderPath . '/*.xlsx');
        $inserted = 0;
        $skipped = 0;
        $byGrade = [];
        $bySubject = [];

        foreach ($files as $excelPath) {
            $filename = basename($excelPath);
            $this->line("    File: {$filename}");

            // Determine grade from filename
            $gradeInfo = $this->determineGradeFromFilename($filename);
            if (!$gradeInfo) {
                $this->line("      Could not determine grade from filename - skipping");
                continue;
            }
            $gradeLevel = $gradeInfo['grade'];

            try {
                $result = $this->processGradeExcel($excelPath, $gradeLevel);
                $inserted += $result['inserted'];
                $skipped += $result['skipped'];
                $byGrade[$gradeLevel] = ($byGrade[$gradeLevel] ?? 0) + $result['inserted'];
                foreach ($result['bySubject'] as $s => $c) {
                    $bySubject[$s] = ($bySubject[$s] ?? 0) + $c;
                }
            } catch (\Exception $e) {
                $this->error("      Error processing: " . $e->getMessage());
            }
        }

        return [
            'inserted' => $inserted,
            'skipped' => $skipped,
            'byGrade' => $byGrade,
            'bySubject' => $bySubject,
        ];
    }

    private function determineGradeFromFilename(string $filename): ?array
    {
        foreach ($this->gradeFileMap as $pattern => $info) {
            if (stripos($filename, $pattern) !== false) {
                return $info;
            }
        }
        return null;
    }

    private function processGradeExcel(string $excelPath, string $gradeLevel): array
    {
        $spreadsheet = IOFactory::load($excelPath);
        $sheetNames = $spreadsheet->getSheetNames();

        $inserted = 0;
        $skipped = 0;
        $bySubject = [];

        foreach ($sheetNames as $sheetName) {
            // Skip non-subject sheets
            $upperSheetName = strtoupper($sheetName);
            if ($this->shouldSkipSheet($upperSheetName)) {
                continue;
            }

            // Normalize subject name
            $subjectName = $this->normalizeSubjectName($sheetName);
            if (!$subjectName) {
                continue;
            }

            $sheet = $spreadsheet->getSheetByName($sheetName);
            $rows = $sheet->toArray();

            // Data starts at row 10 (index 10), row 9 (index 9) is header with "NOMBRES Y APELLIDOS"
            if (count($rows) < 11) {
                continue;
            }

            // Find the PROMEDIO TRIMESTRAL column (column 39 based on structure)
            $nameColumn = 1; // NOMBRES Y APELLIDOS
            $scoreColumn = $this->findScoreColumn($rows[5] ?? [], $rows[6] ?? []);

            if (!$scoreColumn) {
                // Try column 39 as fallback
                $scoreColumn = 39;
            }

            // Process student rows (starting from row 10 = index 10)
            for ($rowIndex = 10; $rowIndex < count($rows); $rowIndex++) {
                $row = $rows[$rowIndex];

                $fullName = trim((string) ($row[$nameColumn] ?? ''));
                if (empty($fullName) || is_numeric(substr($fullName, 0, 1))) {
                    continue;
                }

                $scoreValue = $row[$scoreColumn] ?? null;

                // Handle #DIV/0! and other error values
                if ($scoreValue === null || $scoreValue === '' || $scoreValue === '#DIV/0!' || strpos((string)$scoreValue, '#') === 0) {
                    $skipped++;
                    continue;
                }

                // Convert to numeric
                $score = is_numeric($scoreValue) ? (float) $scoreValue : null;
                if ($score === null || $score < 0 || $score > 100) {
                    $skipped++;
                    continue;
                }

                // Find the student
                $student = $this->findStudent($fullName, $gradeLevel);
                if (!$student) {
                    $skipped++;
                    continue;
                }

                // Insert grade
                DB::table('grades')->insert([
                    'id' => (string) Str::uuid(),
                    'student_id' => $student->id,
                    'subject' => $subjectName,
                    'score' => $score,
                    'max_score' => 100,
                    'type' => 'trimester_exam',
                    'term' => '1st',
                    'date' => '2026-04-15',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $inserted++;
                $bySubject[$subjectName] = ($bySubject[$subjectName] ?? 0) + 1;
            }
        }

        return [
            'inserted' => $inserted,
            'skipped' => $skipped,
            'bySubject' => $bySubject,
        ];
    }

    private function shouldSkipSheet(string $sheetName): bool
    {
        foreach ($this->skipSheets as $skip) {
            if (strpos($sheetName, strtoupper($skip)) !== false) {
                return true;
            }
        }
        return false;
    }

    private function normalizeSubjectName(string $sheetName): ?string
    {
        $upperSheetName = strtoupper(trim($sheetName));

        // Check direct map
        if (isset($this->subjectMap[$upperSheetName])) {
            return $this->subjectMap[$upperSheetName];
        }

        // Check if it's a subject we care about (contains key subject names)
        $keySubjects = ['LENGUAJE', 'MATEMAT', 'CIENCIAS', 'SOCIALES', 'ED. FIS', 'MUSICA', 'ARTES', 'TECNOLOG', 'INGLES', 'VALORES', 'PORTUGUES', 'QUIMICA', 'FISICA', 'PSI'];
        foreach ($keySubjects as $key) {
            if (strpos($upperSheetName, $key) !== false) {
                return $this->subjectMap[$key] ?? $sheetName;
            }
        }

        // Not a subject we recognize
        return null;
    }

    private function findScoreColumn(array $headerRow5, array $headerRow6): ?int
    {
        // Row 5 has "PROMEDIO TRIMESTRAL" at column 39
        // Row 6 has "PROMEDIO" as sub-header for each section
        // We want the column that corresponds to PROMEDIO TRIMESTRAL for the entire sheet

        // Based on the debug output, column 39 has "PROMEDIO TRIMESTRAL" in row 5
        for ($i = 30; $i < 50; $i++) {
            $val = $headerRow5[$i] ?? '';
            if (strpos(strtoupper((string)$val), 'PROMEDIO TRIMESTRAL') !== false) {
                return $i;
            }
        }

        // Fallback: look for column with just "PROMEDIO" that's likely the final average
        for ($i = 35; $i < 45; $i++) {
            $val = $headerRow6[$i] ?? '';
            if (strpos(strtoupper((string)$val), 'PROMEDIO') !== false) {
                return $i;
            }
        }

        return null;
    }

    private function findStudent(string $fullName, string $gradeLevel)
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

        if ($student) {
            return $student;
        }

        // Try just last name match
        return DB::table('students')
            ->where('last_name', 'LIKE', Str::upper($fullName) . '%')
            ->where('grade_level', $gradeLevel)
            ->first();
    }
}
