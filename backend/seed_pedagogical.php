<?php
// EduFlow Pedagogical Records Seeder
// Run after: docker exec eduflow-backend-1 php /var/www/html/artisan migrate:fresh --seed --force

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Read students from JSON
$json = file_get_contents('/tmp/students.json');
$studentsData = json_decode($json, true);

echo "=== EduFlow Pedagogical Records Seeder ===\n";
echo "Found {$studentsData['count']} students\n\n";

// Check connection
try {
    DB::connection()->getPdo();
    echo "DB: Connected\n";
} catch (\Exception $e) {
    echo "DB ERROR: " . $e->getMessage() . "\n";
    exit(1);
}

// === Step 1: Clear existing pedagogical data (keep users/guardians) ===
echo "\n[1/6] Clearing existing pedagogical data...\n";
DB::table('section_student')->delete();
DB::table('section_teacher')->delete();
DB::table('sections')->delete();
DB::table('household_members')->delete();
DB::table('students')->delete();
DB::table('guardians')->delete();
echo "  Cleared: sections, section_student, section_teacher, household_members, students, guardians\n";

// === Step 2: Create student records ===
echo "\n[2/6] Creating students...\n";
$studentIds = []; // keyed by level+grade
$gradeOrder = ['1st','2nd','3rd','4th','5th','6th'];

foreach ($studentsData['students'] as $s) {
    $studentId = (string) Str::uuid();
    DB::table('students')->insert([
        'id' => $studentId,
        'first_name' => $s['first_name'],
        'last_name' => $s['last_name'],
        'grade_level' => $s['grade'],
        'enrollment_status' => 'enrolled',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $key = $s['level'] . '-' . $s['grade'];
    if (!isset($studentIds[$key])) $studentIds[$key] = [];
    $studentIds[$key][] = ['id' => $studentId, 'name' => $s['last_name'] . ', ' . $s['first_name']];
}

$totalStudents = DB::table('students')->count();
echo "  Created {$totalStudents} students\n";

// === Step 3: Create sections per grade level ===
echo "\n[3/6] Creating sections...\n";
$semester = 'Spring 2026';
$sections = [];

$gradeLevels = [
    'PRIMARIO' => [
        '1st' => '1RO PRIMARIA', '2nd' => '2DO PRIMARIA', '3rd' => '3RO PRIMARIA',
        '4th' => '4TO PRIMARIA', '5th' => '5TO PRIMARIA', '6th' => '6TO PRIMARIA',
    ],
    'SECUNDARIO' => [
        '1st' => '1RO SECUNDARIA', '2nd' => '2DO SECUNDARIA', '3rd' => '3RO SECUNDARIA',
        '4th' => '4TO SECUNDARIA', '5th' => '5TO SECUNDARIA',
    ],
];

foreach ($gradeLevels as $level => $grades) {
    foreach ($grades as $grade => $sectionName) {
        $sectionId = (string) Str::uuid();
        DB::table('sections')->insert([
            'id' => $sectionId,
            'name' => $sectionName,
            'grade_level' => $grade,
            'room' => null,
            'semester' => $semester,
            'counselor_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $key = $level . '-' . $grade;
        if (isset($studentIds[$key])) {
            // Attach students to section
            foreach ($studentIds[$key] as $s) {
                DB::table('section_student')->insert([
                    'section_id' => $sectionId,
                    'student_id' => $s['id'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            echo "  Section '{$sectionName}' ({$grade}): {$s['name']} + " . (count($studentIds[$key]) - 1) . " more\n";
        } else {
            echo "  Section '{$sectionName}' (no students)\n";
        }

        $sections[$key] = $sectionId;
    }
}

echo "\n  Total sections: " . DB::table('sections')->count() . "\n";
echo "  Total section_student entries: " . DB::table('section_student')->count() . "\n";

// === Step 4: Create subjects ===
echo "\n[4/6] Creating subjects...\n";

$subjectsByLevel = [
    'PRIMARIO' => [
        ['name' => 'Lenguaje', 'code' => 'LENG', 'area' => 'Comunicación y Lengua', 'campo' => 'Comunidad y Sociedad'],
        ['name' => 'Matemáticas', 'code' => 'MAT', 'area' => 'Matemáticas', 'campo' => 'Ciencia, Tecnología y Producción'],
        ['name' => 'Cs. Naturales', 'code' => 'CNAT', 'area' => 'Ciencias Naturales', 'campo' => 'Vida Tierra y Territorio'],
        ['name' => 'Sociales', 'code' => 'SOC', 'area' => 'Ciencias Sociales', 'campo' => 'Comunidad y Sociedad'],
        ['name' => 'Ed. Física', 'code' => 'EDF', 'area' => 'Educación Física', 'campo' => 'Vida Tierra y Territorio'],
        ['name' => 'Música', 'code' => 'MUS', 'area' => 'Música', 'campo' => 'Comunidad y Sociedad'],
        ['name' => 'Artes', 'code' => 'ART', 'area' => 'Artes Plásticas', 'campo' => 'Comunidad y Sociedad'],
        ['name' => 'Tecnología', 'code' => 'TEC', 'area' => 'Tecnología', 'campo' => 'Ciencia, Tecnología y Producción'],
        ['name' => 'Inglés', 'code' => 'ING', 'area' => 'Lengua Extranjera', 'campo' => 'Comunidad y Sociedad'],
        ['name' => 'Valores', 'code' => 'VAL', 'area' => 'Valores Espirituales', 'campo' => 'Cosmo y Pensamiento'],
        ['name' => 'Portugués', 'code' => 'POR', 'area' => 'Lengua Extranjera', 'campo' => 'Comunidad y Sociedad'],
    ],
    'SECUNDARIO' => [
        ['name' => 'Lenguaje', 'code' => 'LENG', 'area' => 'Comunicación y Lengua', 'campo' => 'Comunidad y Sociedad'],
        ['name' => 'Matemáticas', 'code' => 'MAT', 'area' => 'Matemáticas', 'campo' => 'Ciencia, Tecnología y Producción'],
        ['name' => 'Cs. Naturales', 'code' => 'CNAT', 'area' => 'Cs. Naturales Biología', 'campo' => 'Vida Tierra y Territorio'],
        ['name' => 'Sociales', 'code' => 'SOC', 'area' => 'Ciencias Sociales', 'campo' => 'Comunidad y Sociedad'],
        ['name' => 'Ed. Física', 'code' => 'EDF', 'area' => 'Educación Física y Deportes', 'campo' => 'Vida Tierra y Territorio'],
        ['name' => 'Música', 'code' => 'MUS', 'area' => 'Educación Musical', 'campo' => 'Comunidad y Sociedad'],
        ['name' => 'Artes', 'code' => 'ART', 'area' => 'Artes Plásticas y Visuales', 'campo' => 'Comunidad y Sociedad'],
        ['name' => 'Tecnología', 'code' => 'TEC', 'area' => 'Técnica Tecnológica', 'campo' => 'Ciencia, Tecnología y Producción'],
        ['name' => 'Inglés', 'code' => 'ING', 'area' => 'Lengua Extranjera', 'campo' => 'Comunidad y Sociedad'],
        ['name' => 'Valores', 'code' => 'VAL', 'area' => 'Valores Espiritualidad', 'campo' => 'Cosmo y Pensamiento'],
        ['name' => 'Portugués', 'code' => 'POR', 'area' => 'Lengua Extranjera', 'campo' => 'Comunidad y Sociedad'],
        ['name' => 'Química', 'code' => 'QUIM', 'area' => 'Química', 'campo' => 'Vida Tierra y Territorio'],
        ['name' => 'Física', 'code' => 'FIS', 'area' => 'Física', 'campo' => 'Vida Tierra y Territorio'],
        ['name' => 'PSI - Met. Inv.', 'code' => 'PSI', 'area' => 'Cosmisiones, Filosofía', 'campo' => 'Cosmo y Pensamiento'],
    ],
];

$subjectIds = [];
foreach ($subjectsByLevel as $level => $subjects) {
    foreach ($subjects as $s) {
        $subjectId = (string) Str::uuid();
        DB::table('subjects')->insert([
            'id' => $subjectId,
            'name' => $s['name'],
            'code' => $s['code'],
            'area' => $s['area'],
            'campo' => $s['campo'],
            'level' => $level, // PRIMARIO or SECUNDARIO
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $key = $level . '-' . $s['code'];
        $subjectIds[$key] = $subjectId;
    }
}
echo "  Created " . DB::table('subjects')->count() . " subjects\n";

// === Step 5: Assign subjects to sections ===
echo "\n[5/6] Assigning subjects to sections...\n";
// Each section gets the subjects for its level
$sectionSubjects = [];
foreach ($gradeLevels as $level => $grades) {
    foreach ($grades as $grade => $sectionName) {
        $key = $level . '-' . $grade;
        $sectionId = $sections[$key] ?? null;
        if (!$sectionId) continue;

        foreach ($subjectsByLevel[$level] as $subj) {
            $subjKey = $level . '-' . $subj['code'];
            $subjectId = $subjectIds[$subjKey] ?? null;
            if (!$subjectId) continue;

            DB::table('section_subjects')->insert([
                'id' => (string) Str::uuid(),
                'section_id' => $sectionId,
                'subject_id' => $subjectId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        echo "  Section '{$sectionName}': " . count($subjectsByLevel[$level]) . " subjects assigned\n";
    }
}
echo "  Total section_subject entries: " . DB::table('section_subjects')->count() . "\n";

// === Step 6: Summary ===
echo "\n[6/6] Summary\n";
echo "  Students in DB: " . DB::table('students')->count() . "\n";
echo "  Sections: " . DB::table('sections')->count() . "\n";
echo "  Subjects: " . DB::table('subjects')->count() . "\n";
echo "  Section-student links: " . DB::table('section_student')->count() . "\n";
echo "  Section-subject links: " . DB::table('section_subjects')->count() . "\n";

echo "\n=== Done ===\n";
echo "Students by grade:\n";
foreach (['PRIMARIO' => 'PRIMARIO', 'SECUNDARIO' => 'SECUNDARIO'] as $levelName => $level) {
    echo "  {$levelName}:\n";
    foreach ($gradeOrder as $g) {
        if (!isset($gradeLevels[$level][$g])) continue;
        $count = DB::table('students')
            ->join('section_student', 'students.id', '=', 'section_student.student_id')
            ->join('sections', 'section_student.section_id', '=', 'sections.id')
            ->where('sections.grade_level', $g)
            ->count();
        echo "    {$g}: {$count} students\n";
    }
}