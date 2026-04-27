# EduFlow Deployment Guide — Railway

## Architecture

```
Internet → Railway Frontend (Next.js) → Railway Backend (Laravel) → Railway PostgreSQL
```

Two Railway services:
- `eduflow-backend` — PHP/Laravel API on port 8000
- `eduflow-frontend` — Next.js App on port 3000

## Prerequisites

- Railway CLI: `npm install -g railway`
- GitHub repo: `ruddyribera-ops/EduFlow`
- Railway account connected to GitHub

## Step 1 — Provision PostgreSQL (once)

1. Go to https://railway.app/dashboard
2. New Project → "Provision PostgreSQL"
3. Copy the `DATABASE_URL` from the plugin settings — you'll use it to configure the backend

## Step 2 — Deploy Backend

```bash
# Clone and enter project
git clone https://github.com/ruddyribera-ops/EduFlow.git
cd EduFlow

# Login to Railway
railway login

# Link to Railway project (create a new empty project first in Railway dashboard)
railway init

# Add PostgreSQL plugin
railway add --plugin postgresql

# Set environment variables
railway variables set APP_ENV=production
railway variables set APP_DEBUG=false
railway variables set APP_KEY=base64:YOUR_KEY_HERE
railway variables set MAIL_MAILER=log

# Generate APP_KEY locally first:
# php backend/artisan key:generate --show

# Deploy
railway up --service eduflow-backend

# After container starts, run migrations:
railway run php artisan migrate --force

# Get backend URL for frontend config:
railway variables set NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_URL.up.railway.app/api
```

The Dockerfile will automatically be detected in `backend/Dockerfile.railway`.

## Step 3 — Deploy Frontend

```bash
railway up --service eduflow-frontend
```

The Dockerfile will be detected from `frontend/Dockerfile.railway`. This also builds the Next.js standalone output — no separate build step needed.

## Step 4 — Configure Environment Variables

### Backend (`eduflow-backend`)
| Variable | Value |
|----------|-------|
| APP_ENV | production |
| APP_DEBUG | false |
| APP_KEY | (from `php backend/artisan key:generate --show`) |
| APP_URL | (your backend Railway URL, e.g. `https://eduflow-backend.up.railway.app`) |
| MAIL_MAILER | log |
| CACHE_DRIVER | database |
| SESSION_DRIVER | database |

`DB_CONNECTION=pgsql` and `DB_HOST=localhost` are correct — Railway injects DATABASE_URL automatically from the PostgreSQL plugin.

### Frontend (`eduflow-frontend`)
| Variable | Value |
|----------|-------|
| NODE_ENV | production |
| NEXT_TELEMETRY_DISABLED | 1 |
| NEXT_PUBLIC_API_URL | (backend URL + /api, e.g. `https://eduflow-backend.up.railway.app/api`) |

## Step 5 — Verify Deployment

```bash
# Test backend health
curl https://YOUR_BACKEND_URL/up

# Expected: {"status":"ok"}

# Test login
curl -X POST https://YOUR_BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"director@eduflow.test","password":"password"}'

# Test frontend
curl https://YOUR_FRONTEND_URL
```

## Troubleshooting

### Backend returns 500 on login
- Check `php artisan migrate` ran successfully in the container
- Verify APP_KEY is set correctly (base64: prefix required)
- Check `storage/logs/laravel.log` via `railway logs`

### Frontend 500 errors
- Verify `NEXT_PUBLIC_API_URL` points to the backend URL (no trailing slash, must end in `/api`)
- Check Railway logs: `railway logs --service eduflow-frontend`

### Database connection refused
- Railway PostgreSQL plugin injects `DATABASE_URL` automatically — do NOT set DB_HOST manually
- The `DB_CONNECTION=pgsql` and `DB_HOST=localhost` in the Dockerfile are correct for Railway's internal networking

### Healthcheck failing
- The `/up` route exists in `routes/web.php` — if it returns 404, the container may be serving a different build
- Check Railway build logs to confirm the latest code was deployed

## Useful Commands

```bash
railway up                    # Deploy current branch
railway logs                 # View backend logs
railway logs --service eduflow-frontend
railway variables            # List all variables
railway status              # Current deployment status
railway run <cmd>           # Run one-off command (e.g. php artisan migrate)
```
