<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Students: " . App\Models\Student::count() . "\n";
echo "Sections: " . App\Models\Section::count() . "\n";
echo "Users: " . App\Models\User::count() . "\n";
echo "Guardians: " . App\Models\Guardian::count() . "\n";