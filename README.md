# EduFlow - School CRM

A modern School Relationship Management System built with Laravel 11, Next.js 14, PostgreSQL, and Docker.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui |
| Backend | Laravel 11 (PHP 8.3), Laravel Sanctum |
| Database | PostgreSQL 16, Redis |
| Search | Laravel Scout + Meilisearch |
| Payments | Laravel Cashier (Stripe) |
| SMS | Twilio |
| Deployment | Docker, Railway, GitHub Actions |

## Features

### Phase 1: Database & Core Domain
- Students, Guardians, Household members (many-to-many with `relationship_type`)
- Enrollment leads with pipeline status tracking
- UUID primary keys on all models
- Soft deletes on students, guardians, and leads

### Phase 2: Admissions Kanban Board
- Drag-and-drop UI with `@dnd-kit`
- PATCH `/api/leads/{id}/status` for pipeline updates
- Optimistic UI updates with SWR
- Real-time validation and error rollback

### Phase 3: Security (FERPA Compliance)
- SectionPolicy for authorization
- TeacherScope global query filter
- PostgreSQL Row Level Security (RLS)
- Rate limiting on all API routes

### Phase 4: AI At-Risk Detection
- `php artisan student:detect-risk` nightly command
- Monitors attendance <85% and grade drops >15%
- Creates RiskAlert records
- Fires StudentAtRisk events to notify counselors

### Phase 5: Emergency Broadcast
- SendEmergencyBroadcast action
- Respects guardian communication preferences (email/sms/both)
- Twilio/Vonage integration ready

---

## 🚀 Deployment: Docker + Railway

### Prerequisites
- GitHub account
- Railway account (https://railway.app)
- Docker (for local testing)

### Step 1: Push to GitHub

```bash
cd C:\Users\Windows\eduflow

# Initialize git (if not already)
git init
git add .
git commit -m "Initial EduFlow commit"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/eduflow.git
git branch -M main
git push -u origin main
```

### Step 2: Set up Railway

1. **Go to https://railway.app**
2. **Login with GitHub**

#### Create Backend Service

1. Click **"New Project"** → **"Deploy from GitHub repo"**
2. Select your `eduflow` repo
3. Railway will auto-detect the `backend/Dockerfile.railway`
4. Click **Configure** and set:
   - **Root Directory:** `backend`
   - **Health Check Path:** `/up`
5. Click **"Add Variables"** and add:
   ```
   APP_KEY= (generate with: php artisan key:generate --show)
   APP_ENV=production
   APP_DEBUG=false
   DB_CONNECTION=pgsql
   ```
6. **Add PostgreSQL Database:**
   - Click **"Add Database"** → **"PostgreSQL"**
   - Railway will auto-set `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
7. Click **"Deploy"**

#### Create Frontend Service

1. Click **"New Project"** → **"Deploy from GitHub repo"**
2. Select your `eduflow` repo
3. Set:
   - **Root Directory:** `frontend`
   - **Dockerfile:** `frontend/Dockerfile.railway`
4. Add variables:
   ```
   NODE_ENV=production
   NEXT_TELEMETRY_DISABLED=1
   NEXT_PUBLIC_API_URL= (your backend URL, e.g., https://eduflow-backend.up.railway.app/api)
   ```
5. Click **"Deploy"**

### Step 3: Configure Domain (Optional)

In Railway dashboard:
- **Backend:** Settings → Networking → Generate Domain → `eduflow-backend.railway.app`
- **Frontend:** Settings → Networking → Generate Domain → `eduflow.railway.app`

### Step 4: Initialize Database

Once both services are deployed:

1. Open Railway **Backend Shell** (Actions → Shell)
2. Run:
```bash
php artisan migrate --force
php artisan db:seed --force
```

### Step 5: Add GitHub Actions Secrets

In GitHub repo Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `RAILWAY_TOKEN` | Your Railway API token (from railway.app settings) |

---

## 🐳 Local Development (Docker)

### Prerequisites
- Docker Desktop installed and running

### Quick Start

```bash
# Clone repo (if not already)
cd C:\Users\Windows\eduflow

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Initialize database
docker-compose -f docker-compose.prod.yml exec backend php artisan migrate
docker-compose -f docker-compose.prod.yml exec backend php artisan db:seed

# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

### Stop Services

```bash
docker-compose -f docker-compose.prod.yml down
```

---

## 🖥️ Local Development (Without Docker)

### Prerequisites

- PHP 8.3+ with extensions: `pdo_pgsql`, `mbstring`, `bcmath`, `gd`
- Composer 2.x
- Node.js 20+
- PostgreSQL 16

### Backend Setup

```bash
cd backend

composer install
cp .env.example .env
php artisan key:generate

# Create PostgreSQL database
# psql -U postgres -c "CREATE DATABASE eduflow;"

php artisan migrate
php artisan db:seed
php artisan serve --port=8000
```

### Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api` | Health check | No |
| GET | `/api/up` | Health check | No |
| POST | `/api/auth/login` | Login (returns token) | No |
| GET | `/api/auth/me` | Get current user | Yes |
| GET | `/api/leads` | List leads | Yes |
| GET | `/api/leads/{id}` | Get single lead | Yes |
| PATCH | `/api/leads/{id}/status` | Update lead status | Yes (counselor/admin) |
| GET | `/api/students` | List students | Yes |
| GET | `/api/students/{id}` | Get student + guardians | Yes |
| GET | `/api/sections` | List sections | Yes |

### Test Credentials (Development)

| Email | Role |
|-------|------|
| admin@eduflow.test | Admin |
| sarah@eduflow.test | Counselor |
| emily@eduflow.test | Counselor |
| tom@eduflow.test | Teacher |
| lisa@eduflow.test | Teacher |

---

## 🧪 Running Tests

```bash
# Backend tests
cd backend
php artisan test

# Frontend type check
cd frontend
npx tsc --noEmit

# Run Playwright E2E
cd frontend
npx playwright test
```

---

## 📁 Project Structure

```
eduflow/
├── backend/
│   ├── app/
│   │   ├── Actions/           # Action classes
│   │   ├── Console/Commands/  # Artisan commands
│   │   ├── Enums/            # PHP 8.1 enums
│   │   ├── Events/           # Event classes
│   │   ├── Http/
│   │   │   ├── Controllers/  # API controllers
│   │   │   ├── Requests/     # Form requests
│   │   │   └── Middleware/   # Auth middleware
│   │   ├── Listeners/        # Event listeners
│   │   ├── Models/          # Eloquent models
│   │   ├── Policies/         # Authorization policies
│   │   └── Scopes/          # Global query scopes
│   ├── database/
│   │   ├── migrations/       # Database migrations
│   │   └── seeders/          # Database seeders
│   ├── routes/               # API routes
│   ├── Dockerfile.railway    # Railway deployment
│   └── composer.json
│
├── frontend/
│   ├── app/
│   │   ├── (dashboard)/      # Dashboard routes
│   │   │   └── admissions/   # Kanban board
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── admissions/       # Kanban components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities
│   ├── types/               # TypeScript types
│   ├── Dockerfile.railway    # Railway deployment
│   └── package.json
│
├── .github/
│   └── workflows/
│       └── ci.yml           # GitHub Actions CI/CD
│
├── docker-compose.prod.yml   # Production Docker
├── railway.json             # Railway config (backend)
├── railway.json             # Railway config (frontend)
└── README.md
```

---

## 🔑 Environment Variables

### Backend (.env)

```env
APP_KEY=base64:xxx
APP_ENV=production
APP_DEBUG=false
DB_CONNECTION=pgsql
DB_HOST=your-postgres-host
DB_PORT=5432
DB_DATABASE=eduflow
DB_USERNAME=postgres
DB_PASSWORD=xxx
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://your-backend-url/api
```

---

## 📝 Commands

```bash
# Laravel
php artisan migrate                    # Run migrations
php artisan migrate:fresh              # Drop + re-migrate
php artisan migrate:fresh --seed      # Fresh + seed
php artisan db:seed                   # Seed data
php artisan student:detect-risk       # Run at-risk detection
php artisan route:list                # List routes
php artisan test                      # Run tests

# Next.js
npm run dev                          # Dev server
npm run build                        # Production build
npm run start                        # Start production server
```

---

## License

Proprietary - EduFlow CRM