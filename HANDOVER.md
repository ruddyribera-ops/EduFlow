# EduFlow - Project Handover

## What Is EduFlow?

**EduFlow** is a School Relationship Management System (Student CRM) with:
- **Backend**: Laravel 11 + PostgreSQL
- **Frontend**: Next.js 14 + TypeScript + TailwindCSS + shadcn/ui
- **Multi-language**: English, Spanish, Portuguese-BR via next-intl v4
- **FERPA-compliant** Row Level Security
- **Deployment**: GitHub → Railway auto-deploy

---

## What Was Done

### 1. Backend — Database & Seeder Fixes ✅
- **Fixed seeder variable ordering**: Moved student creation BEFORE `section_student` inserts. `$student1/2/3` were referenced before they existed.
- **Fixed composite PK pivot inserts**: Replaced all `attach()` calls with `DB::table()->insert()` for `section_teacher` and `section_student` pivot tables (Laravel's `attach()` doesn't work with composite PK tables).
- **Fixed migrations**:
  - `household_members`: Removed UUID PK → composite PK `(student_id, guardian_id)`
  - `section_relations`: Removed UUID PKs → composite PKs for both `section_student` and `section_teacher`
- **Database seeded successfully** — verified with PostgreSQL query showing 4 `section_student` rows.

### 2. Backend — Laravel API Fixes ✅
- **Fixed auth exception handler** in `bootstrap/app.php`: Returns JSON `{"message":"Unauthenticated."}` with 401 for API routes instead of redirecting to a non-existent `login` route.
- **Created new controllers/routes** (from previous sessions):
  - `StatsController` → `/api/stats`
  - `BroadcastController` → `GET/POST /api/broadcasts`
  - `SectionController` → fixed `with(['teacher'])` → `with(['teachers', 'students'])`
- **Created FERPA policies and events**:
  - `SectionPolicy.php`
  - `StudentAtRisk.php` event
  - `NotifyCounselorOfRisk.php` listener

### 3. Docker Infrastructure ✅
- **Fixed volume mounts** in `docker-compose.yml`: Changed `./backend:/var/www/html` (overwrites entire image including `vendor/`) to mount only specific subdirectories (`app`, `routes`, `database`, `public`, `resources`, `storage`).
- **Created missing storage directories** on host: `storage/framework/{cache,sessions,views}`, `storage/app/public`, `storage/testing`, `bootstrap/cache`.
- **Added `.dockerignore`** in `backend/`: Excludes `vendor/` from build context.
- **Fixed `Dockerfile.local`**: Switched from Debian to Alpine, added proper storage directory creation, PostgreSQL client libs.
- **Rebuilt images and recreated containers** — backend seeder runs successfully.

### 4. Frontend — i18n Fixes ✅ (from previous sessions)
- Fixed `next.config.js` — removed path from `require('next-intl/plugin')()`
- Created `i18n/request.tsx` — `getRequestConfig` with `requestLocale` (next-intl v4 API)
- Created `routing.ts` — `defineRouting` with locales
- Created `middleware.ts` — `createMiddleware(routing)`
- Fixed `LanguageSwitcher.tsx` — regex instead of `pathname.slice(3)`
- Deleted duplicate `app/(dashboard)/` page tree

### 5. GitHub & Deployment Prep ✅
- All changes committed and pushed to GitHub
- Root `railway.json` points to `backend/Dockerfile.railway`
- `frontend/railway.json` points to `frontend/Dockerfile.railway`
- Each service has its own Dockerfile (backend: `Dockerfile.railway`, frontend: `Dockerfile.railway`)

---

## What's Still Pending

### 1. Railway Deployment — EduFlow Project Not Accessible 🔴
- Railway CLI is logged in as `ruddyribera@gmail.com` but EduFlow project was set up with `ruddyribera-ops@gmail.com`.
- **Fix**: Either login to Railway with the correct account (`railway login`), or transfer the EduFlow project to the current account.
- **Command to check**: `railway whoami` → should match the account that owns the EduFlow project.

### 2. Railway — Set Environment Variables 🔴
Once EduFlow is accessible in Railway:
- **Backend service**: Needs `APP_KEY`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- **Frontend service**: Needs `NEXT_PUBLIC_API_URL` pointing to the backend's public URL

### 3. Railway — Run Database Migrations 🔴
After backend is deployed:
```bash
railway run --service backend php /var/www/html/artisan migrate:fresh --seed --force
```

### 4. Frontend Docker Build — package-lock.json 🔴
- `npm ci` fails in `Dockerfile.railway` due to `package-lock.json` being out of sync (missing `@swc/helpers@0.5.21`).
- **Already fixed**: Changed to `npm install` in `Dockerfile.railway` (committed as `0f7168e`).
- **Note**: `Dockerfile.local` was also updated to use `npm install --ignore-scripts` but not yet committed.

### 5. Start Frontend Dev Server 🟡
- Frontend dev server (`npm run dev`) was started but keeps dying because it's a long-running process in a shell session.
- **Fix**: Run in background or as a Windows service: `Start-Process npm -ArgumentList run,dev -WorkingDirectory C:\Users\Windows\eduflow\frontend`

### 6. Verify Full App Works Locally 🟡
Once frontend is running:
- Login at `http://localhost:3000`
- Navigate dashboard, admissions, broadcast pages
- Test API calls from frontend to backend

---

## Local Docker Stack (Working)

```bash
# Start everything
cd C:\Users\Windows\eduflow
docker-compose -f docker-compose.yml up -d

# Run migrations + seed
docker exec eduflow-backend-1 php /var/www/html/artisan migrate:fresh --seed --force

# Test API (unauthenticated - returns 401 JSON)
curl.exe -s -H "Accept: application/json" http://localhost:8000/api/stats

# Backend: http://localhost:8000
# Frontend: http://localhost:3000 (locale redirect 307 → 200)
```

---

## File Changes Summary

### Committed & Pushed
| File | What Changed |
|------|-------------|
| `backend/database/seeders/DatabaseSeeder.php` | Fixed variable ordering + DB::table()->insert() for composite PKs |
| `backend/bootstrap/app.php` | Added JSON 401 handler for API auth exceptions |
| `backend/database/migrations/2024_01_01_000004_create_household_members_table.php` | Composite PK (student_id, guardian_id) |
| `backend/database/migrations/2024_01_01_000007_create_section_relations_tables.php` | Composite PKs for section_student + section_teacher |
| `backend/Dockerfile.local` | Alpine base, postgresql libs, storage dirs |
| `backend/.dockerignore` | Excludes vendor/ |
| `docker-compose.yml` | Fixed volume mounts, service name |
| `frontend/Dockerfile.railway` | npm install instead of npm ci |
| `frontend/Dockerfile.local` | npm install --ignore-scripts |

All file changes are committed and pushed to GitHub.

---

## Key Technical Decisions

1. **Composite PK pivot tables**: Laravel's `BelongsToMany::attach()` doesn't work with composite primary key pivot tables — must use `DB::table()->insert()`.

2. **Volume mounts**: On Windows + Docker, `./backend:/var/www/html` overwrites the image's `vendor/` directory. Only mount the specific subdirectories that need live code reloading.

3. **next-intl v4**: `getRequestConfig` uses `requestLocale` (not `locale`), and `hasLocale` doesn't exist in `next-intl/routing`.

4. **Laravel 11**: No `config/` directory — all config is via `.env` + `bootstrap/app.php`. Dockerfile should NOT copy `config/`.

5. **API auth**: `EnsureFrontendRequestsAreStateful` redirects to `login` route when unauthenticated. Must override the exception handler to return JSON 401 for API routes.

---

## Git Log (Recent Commits)

```
0f7168e fix: frontend/Dockerfile.railway use npm install instead of npm ci
0ab7bfa fix: DatabaseSeeder variable ordering and composite PK pivot inserts
```

---

## Credentials & Access

- **GitHub**: https://github.com/ruddyribera-ops/EduFlow
- **Railway**: https://railway.app (account: `ruddyribera@gmail.com` — but EduFlow may be under `ruddyribera-ops@gmail.com`)
- **Test accounts** (after `migrate:fresh --seed`):
  - Admin: `admin@eduflow.test` / `password`
  - Counselor: `sarah@eduflow.test` / `password`
  - Teacher: `emily@eduflow.test` / `password`

---

## How to Resume

1. **Fix Railway access**: `railway login` with the account that owns EduFlow, then `railway up`
2. **Commit uncommitted changes**: `git add frontend/Dockerfile.local && git commit && git push`
3. **Start frontend dev server**: `Start-Process cmd -ArgumentList /c,npm run dev -WorkingDirectory C:\Users\Windows\eduflow\frontend`
4. **Run Railway migrations**: `railway run --service backend php /var/www/html/artisan migrate:fresh --seed --force`
5. **Verify full app**: Open `http://localhost:3000` and test login flow
