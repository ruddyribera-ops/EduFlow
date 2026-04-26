# EduFlow — Development Handover
**Session Date:** April 26, 2026
**Developer:** Ruddy Ribera
**Agent:** OpenCode (MiniMax-M2)

---

## Executive Summary

EduFlow is a school management platform for a bilingual (Spanish-English) K-12 school in Bolivia. The app went from a broken Docker setup (out of disk space, broken Dockerfile.local) to a **fully functional local development environment** with 206 real students seeded. The app is live at `http://localhost:3000` (frontend) and `http://localhost:8000` (Laravel API).

---

## 1. Local Development Environment Setup

### Problem
Docker Desktop ran out of disk space and was cleared. The previous `Dockerfile.local` was fundamentally broken (multi-stage build failures, NODE_ENV conflicts, missing dependencies). The app had no way to run locally.

### Solution: Hybrid Local Dev (Docker + Native Windows)

**Architecture:**
- **Docker:** PostgreSQL 16-alpine on port 5432 (`POSTGRES_DB=eduflow_dev`, user/pass: `postgres/postgres`)
- **Native Windows:** PHP 8.3.30 (Winget), Node.js v24, Composer

**How to start EduFlow locally:**

```powershell
# Terminal 1 — Start PostgreSQL (Docker):
docker start eduflow-postgres-1

# Terminal 1 — Start Laravel backend:
php C:\Users\Windows\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe -d "extension_dir=C:\Users\Windows\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\ext" C:\Users\Windows\eduflow\backend\artisan serve --port=8000 --host=0.0.0.0

# Terminal 2 — Start Next.js frontend:
cd C:\Users\Windows\eduflow\frontend; npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Admin login: `admin@eduflow.test` / `password`

### PHP Setup Notes
- PHP installed via winget: `winget install PHP.PHP.8.3`
- PHP location: `C:\Users\Windows\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\`
- `php.ini` manually configured with correct `extension_dir` pointing to the package's `ext/` folder
- Extensions enabled: pdo_pgsql, pgsql, openssl, mbstring, exif, gd, bcmath, curl, zip, fileinfo
- **Important:** PHP only works when PATH is manually refreshed in the same PowerShell call. Always include full PHP path or refresh PATH in the same command.

### Composer Setup
- Composer PHAR downloaded to `C:\Users\Windows\AppData\Local\ComposerSetup\bin\composer.phar`
- Wrapper script at `C:\Users\Windows\AppData\Local\ComposerSetup\bin\composer.bat`
- Run commands with: `composer ...` (composer.bat handles PHP invocation)

### PostgreSQL Connection
- Laravel `.env` uses `DB_HOST=localhost` (not `host.docker.internal`)
- Port: 5432, Database: `eduflow_dev`, User/Pass: `postgres/postgres`
- `DB_CONNECTION=pgsql`

---

## 2. Files Changed This Session

### Modified Files
| File | Change |
|------|--------|
| `docker-compose.yml` | Simplified to PostgreSQL-only (removed multi-service Docker builds) |
| `backend/composer.json` | Updated dependencies |
| `frontend/next.config.js` | Removed `output: 'standalone'` |
| `frontend/playwright.config.ts` | Removed duplicate `baseURL` and invalid `launchOptions` |
| `frontend/Dockerfile.local` | Simplified to `node:20-alpine` with `npm run dev` |
| `frontend/app/[locale]/(dashboard)/students/[id]/page.tsx` | Fixed `useLocale` import (`next/navigation` → `next-intl`) |
| `frontend/i18n/request.tsx` | Minor config update |

### New Files Committed
| File | Purpose |
|------|---------|
| `backend/app/Console/Commands/ImportBaseDeDatosStudents.php` | Imports 206 students from Excel master DB |
| `backend/app/Console/Commands/ImportStudentAccounts.php` | Creates student User accounts from school emails |
| `backend/app/Console/Commands/ImportAttendance.php` | Imports 4,151 daily attendance records |
| `backend/app/Console/Commands/ImportGrades.php` | Imports 1st trimester grades (currently 0 — cells show `#DIV/0!`) |
| `backend/app/Console/Commands/ImportParentMeetings.php` | Imports parent meeting agenda |
| `backend/app/Console/Commands/ImportEduflowStudents.php` | Original JSON-based student import |
| `backend/app/Models/ParentMeeting.php` | Model for parent meetings |
| `backend/database/migrations/2024_01_01_000011_create_subjects_table.php` | Subjects table |
| `backend/database/migrations/2024_01_01_000012_create_section_subjects_table.php` | Section-subject pivot |
| `backend/database/migrations/2024_01_01_000013_create_parent_meetings_table.php` | Parent meetings table |
| `backend/database/migrations/2024_01_01_000014_add_extra_fields_to_guardians_table.php` | `phone_2`, `relationship`, `address` on guardians |
| `backend/seed_pedagogical.php` | Section/subject/section_subject seeder |

---

## 3. Database State

### Current Counts
| Table | Count |
|-------|-------|
| `users` | ~5 (admin + seed data) |
| `students` | **206** |
| `guardians` | **173** |
| `sections` | **14** (NIDITO, PREKINDER, KINDER, 1st-6th PRIMARIO, 1st-5th SECUNDARIO) |
| `subjects` | **25** (11 PRIMARIO + 14 SECUNDARIO) |
| `section_student` | **206** (all students enrolled) |
| `section_subjects` | **136** |
| `attendances` | **4,151** (Feb–Nov 2026, daily P/A/L/T) |
| `parent_meetings` | **17** |

### Student Breakdown (206 total)
| Level | Count |
|-------|-------|
| NIDITO | 10 |
| PREKINDER | 9 |
| KINDER | 14 |
| PRIMARIO 1st–6th | 109 |
| SECUNDARIO 1st–5th | 64 |

### Student Matching Key
**No government ID (RUDE) is available in the source data.** All matching across files uses:
- **Full compound name** (e.g., `"BARBA MENDEZ SANTIAGO"`) — uppercase, accent-stripped
- **Grade level** (e.g., `"1st"` PRIMARIO or `"1st"` SECUNDARIO)

The `grade_level` field uses English ordinals (`1st`, `2nd`, etc.) while source Excel files use Bolivian codes (`1P`, `2P`, `1S`, `2S`, etc.).

**Grade code mapping:**
```php
[
    'ND' => ['grade' => 'NIDITO',  'level' => 'NIDITO'],
    'PK' => ['grade' => 'PREKINDER','level' => 'PREKINDER'],
    'K'  => ['grade' => 'KINDER',  'level' => 'KINDER'],
    '1P' => ['grade' => '1st',     'level' => 'PRIMARIO'],
    '2P' => ['grade' => '2nd',     'level' => 'PRIMARIO'],
    '3P' => ['grade' => '3rd',     'level' => 'PRIMARIO'],
    '4P' => ['grade' => '4th',     'level' => 'PRIMARIO'],
    '5P' => ['grade' => '5th',     'level' => 'PRIMARIO'],
    '6P' => ['grade' => '6th',     'level' => 'PRIMARIO'],
    '1S' => ['grade' => '1st',     'level' => 'SECUNDARIO'],
    '2S' => ['grade' => '2nd',     'level' => 'SECUNDARIO'],
    '3S' => ['grade' => '3rd',     'level' => 'SECUNDARIO'],
    '4S' => ['grade' => '4th',     'level' => 'SECUNDARIO'],
    '5S' => ['grade' => '5th',     'level' => 'SECUNDARIO'],
]
```

---

## 4. Source Data Files

**Location:** `C:\Users\Windows\Downloads\EduFlow - Registros pedagógicos\`

| File | Content | Imported |
|------|---------|---------|
| `BASE DE DATOS ESTUDIANTES LPS 2026.xlsx` | 206 students with parent emails | ✅ Yes |
| `LISTA DE ESTUDIANTES LPS 2026.xlsx` | Student school emails + passwords | ✅ Yes (57 accounts) |
| `REGISTRO DE ASISTENCIAS LPS 2026/` | 14 grade folders × 10 monthly sheets | ✅ Yes (4,151 records) |
| `NIVEL PRIMARIO/` (6 files) | 1st trimester subject grades | ⚠️ Skipped — all cells `#DIV/0!` |
| `NIVEL SECUNDARIO/` (5 files) | 1st trimester subject grades | ⚠️ Skipped — all cells `#DIV/0!` |
| `AGENDA SE SEGUIMIENTO API 1 TRIMESTRE.xlsx` | Parent meeting schedule | ✅ Yes (17 meetings) |
| `Lista primari IQMAX.xlsx` | Tutor phone numbers | ❌ Not imported |
| `LISTA DE DELEGADOS.xlsx` | Class delegates | ❌ Not imported |

### Re-run commands for grades (when data is available):
```powershell
php -d "extension_dir=..." -d "memory_limit=1024M" ...\artisan eduflow:import-grades
```

---

## 5. New `parent_meetings` Table

**Migration:** `2024_01_01_000013_create_parent_meetings_table.php`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `student_id` | uuid | FK → students |
| `meeting_date` | date | |
| `tutor_name` | string | Teacher/tutor name |
| `day_time` | string | e.g. "MARTES 24/03 A LAS 12:15" |
| `attendees` | string | Who attended |
| `modality` | string | PRESENCIAL / VIRTUAL |
| `confirmation` | string | SI / NO |
| `observation` | text | Notes |
| `timestamps` | | created_at, updated_at |

**Model:** `app/Models/ParentMeeting.php` — belongs to Student.

---

## 6. Guardians — New Fields

**Migration:** `2024_01_01_000014_add_extra_fields_to_guardians_table.php`

| Column | Type | Notes |
|--------|------|-------|
| `phone` | string | Already existed |
| `phone_2` | string | New — second contact number |
| `relationship` | string | New — "Madre", "Padre", "Tutor", etc. |
| `address` | text | New — full address |

Ruddy plans to populate these manually later.

---

## 7. Pending Work

### High Priority
1. **1st Trimester Grades** — Source Excel files exist but cells are empty (`#DIV/0!`). Re-run `eduflow:import-grades` when teachers fill in actual scores.
2. **Student Login** — 57 of 206 students have User accounts (from `LISTA DE ESTUDIANTES`). The remaining students have no accounts yet.

### Medium Priority
1. **Student grade-level sections** — 206 students exist but are not yet assigned to sections via `section_student`. The import created sections but the student-section attachment needs verification.
2. **Attendance UI** — The attendance data is in the DB but there's no UI to view it.
3. **Grades UI** — No UI for entering/viewing grades yet.
4. **Parent Meetings UI** — Table exists, no UI.

### Low Priority
1. **Tutor phone numbers** — `Lista primari IQMAX.xlsx` has phones, not imported (Ruddy said manual entry for now).
2. **Class delegates** — `LISTA DE DELEGADOS.xlsx` not imported.
3. **RUDE extraction** — The `all_students_with_rude.json` exists (not committed) with RUDE numbers extracted from another source. Could be matched to students later if a RUDE field is added to the students table.

---

## 8. Known Issues

1. **PHP PATH issue** — PHP only works when PATH is refreshed in the same PowerShell call. Use full PHP path or chain commands with `;`.
2. **Grades show `#DIV/0!`** — Source Excel files have formulas for averages but no actual grade data entered yet.
3. **No RUDE/gov ID field** — Students table has no RUDE column. Matching is by name+grade only (unreliable for duplicates).
4. **57 of 206 students have accounts** — `student_id` on User model is not yet widely populated.

---

## 9. Git

**Last commit:** `be848de` — `feat: add local dev setup, import pipeline, and 206 real students`
**Branch:** `main` (pushed ✅)

**Privacy:** `all_students.json` and `all_students_with_rude.json` are gitignored (contain student PII).

---

## 10. Quick Reference

```powershell
# Start everything
docker start eduflow-postgres-1
php ...\php.exe -d "extension_dir=...\ext" ...\artisan serve --port=8000 --host=0.0.0.0
cd ...\frontend; npm run dev

# Re-import students (if BASE DE DATOS Excel is updated)
php ...\artisan eduflow:import-base-de-datos

# Re-import attendance
php ...\artisan eduflow:import-attendance

# Re-import grades (when data available)
php ...\artisan eduflow:import-grades

# Login
http://localhost:3000
admin@eduflow.test / password
```
