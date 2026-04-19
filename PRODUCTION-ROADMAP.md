# EduFlow — Production Readiness Roadmap

**Last Updated:** April 19, 2026
**Status:** Architecture Complete, Local Dev Running (Mock API), Backend Pending PHP/PostgreSQL

---

## Quick Status

| Component | Status |
|-----------|--------|
| **Frontend (Next.js)** | ✅ Code complete, running on :3000 |
| **Mock API (Node)** | ✅ Running on :8000 with seeded data |
| **Laravel Backend** | ⚠️ Code complete, NOT running (needs PHP/Composer/Postgres) |
| **Database** | ⚠️ Schema complete, NOT migrated (no Postgres) |

---

## Phase 1: Local Dev Environment (Day 1)

### 1.1 Install PHP 8.3 + Extensions

**Windows (choose one):**

```powershell
# Option A: XAMPP (recommended for beginners)
# Download from https://www.apachefriends.org/
# Includes: PHP 8.3, Apache, MariaDB (MySQL), phpMyAdmin

# Option B: Windows Installer directly
# Download from https://windows.php.net/download/
# You must ALSO install:
#   - Visual C++ Redistributable (vc_redist.x64.exe)
```

**Required PHP extensions (verify in php.ini):**
```ini
extension=pdo_pgsql      ; PostgreSQL driver
extension=bcmath         ; For UUID generation
extension=mbstring       ; String handling
extension=openssl        ; HTTPS/API calls
extension=curl           ; HTTP requests
extension=tokenizer     ; Laravel framework
```

**Verify installation:**
```powershell
php -v                  # Should show PHP 8.3.x
php -m                  # List loaded extensions
```

### 1.2 Install Composer

```powershell
# Download from https://getcomposer.org/download/
# Or via winget:
winget install --id=Composer.Copmg -e --accept-source-agreements --accept-package-agreements

# Verify:
composer --version
```

### 1.3 Install PostgreSQL 16

```powershell
# Option A: Download installer from https://www.postgresql.org/download/windows/

# Option B: Use Docker (if Docker Desktop available)
docker run -d --name eduflow-pg `
  -e POSTGRES_DB=eduflow `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -p 5432:5432 `
  postgres:16-alpine
```

**Verify PostgreSQL:**
```powershell
psql -U postgres -c "SELECT version();"
```

### 1.4 Install Docker Desktop (OPTIONAL — simplifies everything)

```powershell
# Download from https://www.docker.com/products/docker-desktop/
# After install, just run:
cd C:\Users\Windows\eduflow
docker-compose up -d
docker-compose exec backend php artisan migrate --seed
# Done. Skip to Phase 2.
```

---

## Phase 2: Laravel Backend Setup (Day 1)

### 2.1 Install Backend Dependencies

```powershell
cd C:\Users\Windows\eduflow\backend

# Install Laravel + all packages
composer install

# Verify it worked (vendor folder should exist)
dir vendor
```

### 2.2 Configure Environment

```powershell
# Copy example env
copy .env.example .env

# Generate application key
php artisan key:generate

# Verify key was added to .env
select-string .env -pattern APP_KEY
```

### 2.3 Configure PostgreSQL Connection

Edit `C:\Users\Windows\eduflow\backend\.env`:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=eduflow
DB_USERNAME=postgres
DB_PASSWORD=postgres
```

### 2.4 Create Database

```powershell
# Connect to Postgres
psql -U postgres

# In psql console:
CREATE DATABASE eduflow;
\q
```

### 2.5 Run Migrations + Seed

```powershell
# Run all migrations
php artisan migrate

# Seed with sample data (creates test users)
php artisan db:seed

# Verify users were created
php artisan tinker
>>> App\Models\User::count()   # Should return 5
```

### 2.6 Start Laravel Server

```powershell
# In terminal 1:
php artisan serve --port=8000

# Test it works:
# GET http://localhost:8000/api/leads
# Should return JSON with 5 leads
```

---

## Phase 3: Connect Frontend to Real Backend (Day 1)

### 3.1 Update Frontend Environment

Create `C:\Users\Windows\eduflow\frontend\.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 3.2 Restart Frontend

```powershell
# Kill current frontend (Ctrl+C in its terminal)
# Or find and kill process on port 3000

# In frontend terminal:
cd C:\Users\Windows\eduflow\frontend
npm run dev
```

### 3.3 Verify End-to-End

Open browser:
- **http://localhost:3000/admissions** — Should show Kanban with 5 leads
- Drag a lead to another column → Should call `PATCH /api/leads/:id/status`
- Page should update with optimistic UI

---

## Phase 4: Authentication Setup (Day 2)

### 4.1 Sanctum Configuration

In `C:\Users\Windows\eduflow\backend\.env`:

```env
SANCTUM_STATEFUL_DOMAINS=localhost:3000
SESSION_DRIVER=database
```

### 4.2 Run Sanctum Migrations

```powershell
php artisan migrate
```

### 4.3 Test Login Flow

```powershell
# In terminal:
POST http://localhost:8000/api/auth/login
Body: { "email": "admin@eduflow.test" }

# Should return: { "token": "1|abc...", "user": {...} }

# Use token:
GET http://localhost:8000/api/leads
Header: Authorization: Bearer <token>

# Should return leads (200)
```

---

## Phase 5: Production-Ready Docker Setup (Day 2)

### 5.1 Build Docker Images

```powershell
cd C:\Users\Windows\eduflow

# Build all services
docker-compose build

# Start all services
docker-compose up -d

# Watch logs
docker-compose logs -f
```

### 5.2 Initialize Database in Docker

```powershell
# Wait for db healthcheck to pass (~10 seconds)
docker-compose exec backend php artisan migrate --seed
```

### 5.3 Verify Docker Stack

```powershell
# Check all services are healthy
docker-compose ps

# Test endpoints
curl http://localhost:8000/up          # Backend health
curl http://localhost:3000           # Frontend health
```

---

## Phase 6: Pre-Production Checklist (Day 3)

### 6.1 Security Hardening

```env
# In .env (PRODUCTION)
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

# Generate new APP_KEY
php artisan key:generate --show
```

### 6.2 Environment Variables to Configure

| Variable | Development | Production | Notes |
|----------|-------------|------------|-------|
| `APP_ENV` | `local` | `production` | |
| `APP_DEBUG` | `true` | `false` | NEVER true in prod |
| `APP_KEY` | ✅ generated | ✅ regenerate | |
| `DB_HOST` | `127.0.0.1` | Postgres host | |
| `MAIL_MAILER` | `log` | `smtp` | Configure SMTP |
| `TWILIO_SID` | — | Your credentials | For SMS |
| `STRIPE_KEY` | — | Test keys | |
| `STRIPE_SECRET` | — | Live keys | |

### 6.3 Run Full Test Suite

```powershell
# Backend tests
cd backend
php artisan test

# Frontend type check
cd frontend
npx tsc --noEmit

# Frontend build
npm run build
```

### 6.4 Final Verification

- [ ] `php artisan migrate` runs without errors
- [ ] `php artisan db:seed` creates test users
- [ ] Login endpoint returns valid Sanctum token
- [ ] All 5 API endpoints return correct data
- [ ] Frontend Kanban drag-drop updates via API
- [ ] Docker Compose builds without errors
- [ ] Docker stack starts and passes healthchecks

---

## Phase 7: Deployment (Day 4+)

### 7.1 Recommended Hosting Options

| Platform | Difficulty | Good For |
|----------|------------|----------|
| **Railway** | Easy | Fastest deploy, $5/month |
| **Laravel Vapor** | Medium | Managed AWS, scalable |
| **DigitalOcean App Platform** | Easy | Good Next.js support |
| **AWS ECS / Render** | Hard | Full control |

### 7.2 Railway Deploy (Recommended)

```powershell
# 1. Push to GitHub
git init
git add .
git commit -m "Initial EduFlow commit"
git remote add origin https://github.com/YOUR_USERNAME/eduflow.git
git push -u origin main

# 2. Connect GitHub to Railway
#    Go to https://railway.app
#    New Project → Deploy from GitHub
#    Select eduflow repo

# 3. Add PostgreSQL database
#    Railway → New → Database → PostgreSQL

# 4. Set environment variables in Railway dashboard
#    APP_KEY= (generate locally, copy)
#    DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD (from Railway)

# 5. Set start command
#    Frontend: npm run dev (dev) or npm start (prod)
#    Backend: php artisan serve --port=8000

# 6. Deploy!
```

---

## Quick Command Reference

```powershell
# ===================
# LOCAL DEVELOPMENT
# ===================

# Terminal 1: Mock API (already running)
node C:\Users\Windows\eduflow\mock-api.js

# Terminal 1: OR Real Laravel Backend (after PHP install)
cd C:\Users\Windows\eduflow\backend
php artisan serve --port=8000

# Terminal 2: Frontend
cd C:\Users\Windows\eduflow\frontend
npm run dev

# ===================
# DOCKER (when ready)
# ===================
cd C:\Users\Windows\eduflow
docker-compose up -d
docker-compose exec backend php artisan migrate --seed
docker-compose logs -f backend

# ===================
# LARAVEL COMMANDS
# ===================
php artisan migrate                    # Run migrations
php artisan migrate:rollback          # Undo last migration
php artisan migrate:fresh             # Drop all tables + re-migrate
php artisan migrate:fresh --seed      # Fresh + seed
php artisan db:seed                   # Seed data
php artisan tinker                    # Interactive PHP REPL
php artisan route:list                # List all routes
php artisan test                      # Run tests

# ===================
# FRONTEND COMMANDS
# ===================
npm run dev                          # Dev server
npm run build                        # Production build
npx tsc --noEmit                     # Type check
npm run lint                         # ESLint check
```

---

## Troubleshooting

### "PHP not recognized"
```powershell
# Find PHP location
Get-ChildItem "C:\" -Recurse -Filter "php.exe" -ErrorAction SilentlyContinue

# Add to PATH permanently
# System Properties → Environment Variables → Path → Add PHP bin folder
```

### "Composer not found"
```powershell
# After Composer install, restart terminal
# If still not found, restart computer
```

### "PostgreSQL connection refused"
```powershell
# Check Postgres is running
Get-Service | Where-Object {$_.Name -like "*postgres*"}

# Or start it
pg_ctl -D "C:\Program Files\PostgreSQL\16\data" start
```

### "Port 8000 already in use"
```powershell
# Find process on port 8000
Get-NetTCPConnection -LocalPort 8000

# Kill it
Stop-Process -Id <OwningProcess> -Force
```

### "npm run dev fails"
```powershell
# Clear Next.js cache
Remove-Item -Recurse -Force "C:\Users\Windows\eduflow\frontend\.next"

# Reinstall dependencies
cd C:\Users\Windows\eduflow\frontend
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

---

*Document generated: April 19, 2026*
*For: Senior Developer Team / DevOps*