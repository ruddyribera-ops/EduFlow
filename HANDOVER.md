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

### 6. Backend — Auth + Risk Alerts + CORS Wiring ✅ (April 19 evening)
The frontend was calling five endpoints that simply didn't exist on the Laravel API (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `GET /api/risk-alerts`, `PATCH /api/risk-alerts/{id}`). Login returned 404 against the backend, so the dashboard never worked against real data. Added:
- **`AuthController`** (`backend/app/Http/Controllers/Api/AuthController.php`) — `login` validates credentials with `Hash::check`, revokes old tokens, returns `{data: {token, user}}`; `me` returns the authenticated user; `logout` deletes the current access token.
- **`RiskAlertController`** (`backend/app/Http/Controllers/Api/RiskAlertController.php`) — `index` paginated list with `?status=` filter + `student` eager-load; `update` accepts `{status, notes}` with enum-validated status.
- **`config/cors.php`** — allows `http://localhost:3000` + `FRONTEND_URL` env, `supports_credentials: true`, covers `api/*`, `sanctum/csrf-cookie`, `up`. Verified preflight returns `Access-Control-Allow-Origin: http://localhost:3000`.
- **`backend/routes/api.php`** — registered `POST auth/login` (public, throttle:10), and `GET auth/me`, `POST auth/logout`, `GET risk-alerts`, `PATCH risk-alerts/{riskAlert}` inside the `auth:sanctum` group.
- **Migration `2024_01_02_000001_add_notes_and_resolved_to_risk_alerts`** — adds `notes TEXT NULL` column and swaps the Postgres enum CHECK so `status` now accepts `resolved` alongside `pending|reviewed|escalated` (frontend already uses `resolved`).
- **Sanctum migration** published via `vendor:publish --tag=sanctum-migrations`, then edited to use `uuidMorphs('tokenable')` instead of default `morphs()` — our User PK is UUID, not BIGINT.
- **`RiskAlert` model** — added `notes` to `$fillable`, added `STATUS_RESOLVED` constant.
- **`docker-compose.yml`** — mounted `./backend/config:/var/www/html/config` so new config files reach the container, and set `CACHE_STORE=array` + `SESSION_DRIVER=array` + `SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000` + `FRONTEND_URL=http://localhost:3000` in the backend service env. The `array` cache avoids the missing `cache` table that the throttle middleware was hitting.
- **Deleted** `frontend/app/login/page.tsx` — leftover non-locale duplicate of `app/[locale]/login/page.tsx`.
- **Verified end-to-end**: `POST /api/auth/login` → 200 with `{data:{token, user}}`; `GET /api/auth/me` with bearer token → 200; `/api/stats`, `/api/leads`, `/api/students`, `/api/sections`, `/api/risk-alerts` all return seeded data; `POST /api/auth/logout` revokes the token (next request → 401). i18n locales `/en`, `/es`, `/pt-BR` all return HTTP 200 with correct `lang` attribute.

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

### 5. Start Frontend Dev Server ✅
Frontend is running on port 3000 (native Windows `npm run dev`, PID visible via `netstat -ano | grep :3000`). All three locales return 200:
- `http://localhost:3000/en/login` → 200 `<html lang="en">`
- `http://localhost:3000/es/login` → 200 `<html lang="es">`
- `http://localhost:3000/pt-BR/login` → 200 `<html lang="pt-BR">`
- `http://localhost:3000/` → 307 → `/en`

### 6. Verify Full App Works Locally ✅
Backend + frontend wired against Postgres (Docker). End-to-end verified:
```bash
# Login
curl.exe -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"email":"admin@eduflow.test","password":"password"}'
# → {"data":{"token":"1|...","user":{"id":"...","name":"Admin User",...}}}

# Authenticated calls (all return real seeded data)
curl.exe -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/auth/me
curl.exe -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/stats
curl.exe -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/leads
curl.exe -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/students
curl.exe -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/sections
curl.exe -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/risk-alerts
```
CORS preflight from `http://localhost:3000` returns `Access-Control-Allow-Origin: http://localhost:3000` and `Access-Control-Allow-Credentials: true`. Logout revokes token (subsequent request → 401).

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

### New (April 19 evening — auth + risk-alerts + CORS)
| File | What Changed |
|------|-------------|
| `backend/app/Http/Controllers/Api/AuthController.php` | **NEW** — login / me / logout with Sanctum |
| `backend/app/Http/Controllers/Api/RiskAlertController.php` | **NEW** — index (paginated, status filter) + update |
| `backend/config/cors.php` | **NEW** — allows localhost:3000 + FRONTEND_URL, credentials |
| `backend/routes/api.php` | Added auth/login (public), auth/me, auth/logout, risk-alerts routes |
| `backend/app/Models/RiskAlert.php` | Added `notes` fillable + `STATUS_RESOLVED` |
| `backend/database/migrations/2024_01_02_000001_add_notes_and_resolved_to_risk_alerts.php` | **NEW** — adds `notes` column + expands status CHECK to include `resolved` |
| `backend/database/migrations/2026_04_19_212003_create_personal_access_tokens_table.php` | **NEW** (Sanctum, published) — edited to use `uuidMorphs('tokenable')` for UUID User PKs |
| `docker-compose.yml` | Mounted `./backend/config`, added CACHE_STORE=array / SESSION_DRIVER=array / SANCTUM_STATEFUL_DOMAINS / FRONTEND_URL env |
| `frontend/app/login/page.tsx` | **DELETED** — leftover duplicate of `app/[locale]/login/page.tsx` |

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
c786b00 (HEAD -> main) feat: EduFlow fully wired — Auth + RiskAlerts + CORS + verified e2e
4e5c74a fix: HANDOVER.md remove stale uncommitted note
c8b832b docs: add HANDOVER.md and fix frontend/Dockerfile.local
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

Everything is committed and pushed. The local stack is fully working. Only Railway deployment remains:

1. **Fix Railway account mismatch**: `railway logout` → `railway login` with the account that owns EduFlow (`ruddyribera-ops@gmail.com`).
2. **Link the Railway services to GitHub**: In the Railway dashboard, connect the EduFlow repo and configure each service:
   - **Backend**: Root directory = `backend`, Dockerfile = `Dockerfile.railway`
   - **Frontend**: Root directory = `frontend`, Dockerfile = `Dockerfile.railway`
3. **Set Railway environment variables**:
   - **Backend**: `APP_KEY`, `DB_HOST` (PostgreSQL connection string), `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `CACHE_STORE=array`, `SESSION_DRIVER=array`, `SANCTUM_STATEFUL_DOMAINS`, `FRONTEND_URL`
   - **Frontend**: `NEXT_PUBLIC_API_URL` (backend's public URL)
4. **Run migrations on Railway**:
   ```bash
   railway run --service backend php /var/www/html/artisan migrate:fresh --seed --force
   ```
