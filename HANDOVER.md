# EduFlow - School CRM Handover Document

**Project:** EduFlow (School Relationship Management System)
**Last Updated:** April 19, 2026 (Claude Code session 2)
**Status:** Phase 1-5 Architecture Complete, Frontend running end-to-end against mock API, backend pending PHP toolchain install

---

## Executive Summary

EduFlow is a Vertical SaaS CRM for the Education sector. Architecture for all 5 phases is complete:
- Database schema with UUID primary keys
- Eloquent models with relationships
- Admissions Kanban (Next.js + Laravel API)
- FERPA-compliant Row Level Security (policy draft + global scope)
- AI At-Risk detection command
- Emergency broadcast respecting communication preferences

**Current state:** Frontend Kanban runs locally end-to-end against an expanded Node mock API (zero PHP dependency). Critical frontend bugs and migration FK gaps fixed. Backend Laravel still needs `composer install` + Postgres (dev machine lacks PHP/Composer/Docker/Postgres).

---

## 🆕 Session 2 Changes (April 19, 2026)

### Fixed (Frontend)
| File | Before | After |
|---|---|---|
| `frontend/types/index.ts` | **Empty directory** — `@/types` imports broken | Created with `Lead`, `LeadStatus`, `Student`, `Guardian`, `Section`, `ApiListResponse<T>` |
| `frontend/lib/constants.ts` | N/A | New — centralizes `PIPELINE_STAGES`, `STAGE_LABELS`, `STAGE_COLORS` |
| `frontend/app/(dashboard)/admissions/page.tsx` | Redefined `Lead` locally (incompatible with hook's) + duplicated stage constants | Imports from `@/types` and `@/lib/constants`; uses `LeadStatus` everywhere |
| `frontend/components/admissions/KanbanColumn.tsx` | Duplicated `STAGE_LABELS`/`STAGE_COLORS` | Imports from `@/lib/constants`; props typed as `LeadStatus` |
| `frontend/hooks/useLeads.ts` | Local incomplete `Lead` interface, no `credentials: 'include'` | Uses shared type, Sanctum-ready credentials, typed `LeadStatus` on update |
| `frontend/app/page.tsx` | **Did not exist** — `/` returned 404 | New — `redirect('/admissions')` |

**Verification:** `npx tsc --noEmit` clean. `curl http://localhost:3000/admissions` → 200.

### Fixed (Backend migrations)
| File | Before | After |
|---|---|---|
| `2024_01_01_000005_create_enrollment_leads_table.php` | `assigned_counselor_id` plain UUID, no FK | `foreignUuid()->constrained('users')->nullOnDelete()` |
| `2024_01_01_000006_create_sections_table.php` | `counselor_id`, `teacher_id` plain UUIDs, no FK | Both as `foreignUuid()->constrained('users')->nullOnDelete()` |

### Expanded (Mock API)
`mock-api.js` rewritten from scratch (zero deps, Node only). Now serves:

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/login` | Body `{email}` → returns `{token: mock-<id>, user}` (stub) |
| GET | `/api/auth/me` | Requires `Authorization: Bearer mock-<id>` |
| GET | `/api/leads?status=&source_campaign=&page=&per_page=` | **Validates status enum** (422 on invalid), paginated |
| GET | `/api/leads/:id` | Single lead |
| PATCH | `/api/leads/:id/status` | Validates enum (422), auto-sets `enrolled_at` when `status=enrolled` |
| GET | `/api/students` / `/api/students/:id` | Guardians eager-loaded |
| GET | `/api/sections?grade_level=` | Filterable |
| GET | `/up` | Health check |

Response shape mirrors Laravel API resources: `{data, meta: {total, per_page, current_page}}` for lists, `{data}` for single resources.

---

## 🏃 Running Locally RIGHT NOW (verified working)

```bash
# Terminal 1 — Mock API (Node only, no PHP needed)
cd C:\Users\Windows\eduflow
node mock-api.js
# → http://localhost:8000

# Terminal 2 — Frontend
cd C:\Users\Windows\eduflow\frontend
npm run dev
# → http://localhost:3000 (auto-redirects to /admissions)
```

Open http://localhost:3000 → Kanban with 5 seeded leads, drag-drop works, optimistic UI with 422 validation + rollback on failure.

---

## ✅ Completed Architecture (unchanged from session 1)

### PHASE 1: Database & Core Domain Model

#### Migrations (`backend/database/migrations/`)

| File | Purpose |
|------|---------|
| `2024_01_01_000001_create_users_table.php` | Users with roles (admin, counselor, teacher, guardian) |
| `2024_01_01_000002_create_students_table.php` | Students with enrollment_status enum, grade_level |
| `2024_01_01_000003_create_guardians_table.php` | Guardians with communication_preference enum |
| `2024_01_01_000004_create_household_members_table.php` | PIVOT with `relationship_type` enum |
| `2024_01_01_000005_create_enrollment_leads_table.php` | ✅ **FK on assigned_counselor_id (session 2)** |
| `2024_01_01_000006_create_sections_table.php` | ✅ **FKs on counselor_id/teacher_id (session 2)** |
| `2024_01_01_000007_create_section_relations_tables.php` | section_student + section_teacher pivots |
| `2024_01_01_000008_create_academic_tables.php` | attendances + grades |
| `2024_01_01_000009_create_risk_alerts_table.php` | RiskAlert storage |

#### Models (`backend/app/Models/`)

| Model | Key Features |
|-------|-------------|
| `Student.php` | HasUuids, SoftDeletes, guardians() BelongsToMany |
| `Guardian.php` | HasUuids, SoftDeletes, prefersEmail()/prefersSms() |
| `EnrollmentLead.php` | STATUSES const, full_name accessor |
| `Section.php` | ⚠️ has BOTH `teacher()` (1:1) and `teachers()` (N:M) — needs reconciliation |
| `User.php` | HasApiTokens (Sanctum), role constants |
| `RiskAlert.php` | risk_factors JSON cast |
| `Attendance.php` | ⚠️ missing HasUuids (inconsistent with schema) |
| `Grade.php` | ⚠️ missing HasUuids (inconsistent with schema) |

### PHASE 2: Admissions Kanban — ✅ Running (frontend via mock API)
### PHASE 3: FERPA & Security — Policy/scope written, **not registered**
### PHASE 4: AI At-Risk Detection — Command/event/listener written, **not registered**
### PHASE 5: Communication Hub — Action + notifications written, Twilio creds pending

---

## 🐛 Remaining Bugs (prioritized for OpenCode)

### 🔴 Critical (block Postgres production)
1. **`LeadController@index` uses MySQL-only `FIELD()`** — breaks on Postgres. Replace with `CASE WHEN status='inquiry' THEN 1 WHEN ... END` or order by a dedicated `pipeline_position` column.
2. **`Section` model conflict** — has `teacher_id` column (1:1) AND `section_teacher` pivot (N:M). Pick one.
3. **`Attendance` / `Grade` missing `HasUuids`** trait — will fail joins with UUID-keyed students.

### 🟠 Security (must fix before any real deploy)
4. **`UpdateLeadStatusRequest::authorize()` returns `true`** — any authenticated user can change any lead status. Restrict to admin/counselor.
5. **Policies NOT registered** in `AuthServiceProvider::$policies`.
6. **StudentAtRisk event/listener NOT registered** in `EventServiceProvider`.
7. **No rate limiting** on API routes — add `throttle:60,1`.
8. **Seeder prints credentials** to console — mask or remove.
9. **Passwordless token generation logic** — method stub exists on Guardian, no controller/flow.

### 🟡 Infra
10. **`composer.lock` missing** — builds non-reproducible.
11. **No `.dockerignore`** (backend and frontend).
12. **Frontend Dockerfile runs `npm run dev`** — not production-ready.
13. **docker-compose lacks healthchecks** — frontend boots before DB ready.
14. **RLS migration out of sequence** — `xxxx_add_rls_policies_for_sections.php` not yet timestamped.

### 🟢 Code quality
15. **`GetLeadsRequest` missing** — controller accepts `status` query string without validation.
16. **`CommunicationPreference` enum** should be a PHP 8.1 `enum`, not hardcoded `in_array()`.
17. **Error UI on frontend** — `useLeads` throws on rollback but no toast component.

---

## 🧪 Test Plan for OpenCode (CI/CD ready)

### Backend — PHPUnit / Pest (pyramid bottom → top)

**Unit (`tests/Unit/Models/`)**
- `StudentTest` — UUID auto-generation, soft delete, `guardians()` pivot with `relationship_type`
- `GuardianTest` — `prefersEmail()` / `prefersSms()` boolean matrix for email_only/sms_only/both
- `EnrollmentLeadTest` — enum cast, `full_name` accessor, `STATUSES` constant matches migration
- `RiskAlertTest` — `risk_factors` JSON cast, state transitions

**Feature (`tests/Feature/Api/`)**
- `LeadControllerTest`:
  - `test_index_requires_auth` (401 without token)
  - `test_index_filters_by_status_enum`
  - `test_index_rejects_invalid_status_422`
  - `test_index_orders_by_pipeline_position_postgres_safe`
  - `test_update_status_sets_enrolled_at_only_on_enrolled`
  - `test_update_status_rejects_invalid_enum_422`
  - `test_counselor_cannot_update_unassigned_lead` (after policy)
- `StudentControllerTest`:
  - `test_index_has_no_n_plus_1` (query count with `DB::getQueryLog`)
  - `test_show_eager_loads_guardians_sections_attendances_grades`
- `SectionControllerTest`:
  - `test_index_filters_by_grade_level`
- `AuthTest`:
  - `test_sanctum_login_returns_token`
  - `test_me_endpoint_requires_token`

**Policy (`tests/Feature/Policies/`)**
- `SectionPolicyTest` — full matrix {admin, counselor, teacher, guardian} × {viewAny, view, create, update, delete, manageStudents}
- `TeacherScopeTest` — teacher sees only their section students; admin/counselor see all
- `LeadPolicyTest` (to create) — counselor only sees/edits assigned leads

**Command (`tests/Feature/Commands/`)**
- `StudentDetectRiskCommandTest`:
  - `test_creates_alert_for_attendance_below_85`
  - `test_creates_alert_for_grade_decline_above_15`
  - `test_dry_run_does_not_persist`
  - `test_dispatches_student_at_risk_event`

**Action (`tests/Feature/Actions/`)**
- `SendEmergencyBroadcastTest`:
  - `test_respects_email_only_preference`
  - `test_respects_sms_only_preference`
  - `test_sends_both_channels_when_preference_is_both`
  - `test_for_students_scopes_to_guardian_list`
  - `test_returns_correct_skipped_count`

**Migration (`tests/Feature/Migrations/`)**
- `test_household_members_cascades_on_student_delete`
- `test_enrollment_leads_sets_null_on_counselor_delete` (verifies session 2 FK fix)
- `test_sections_sets_null_on_user_delete` (verifies session 2 FK fix)
- `test_rls_blocks_cross_tenant_read` (once RLS migrated)

### Frontend — Vitest + React Testing Library
- `useLeads.test.ts` — loading state, optimistic mutate, rollback on fetch error, credentials included
- `KanbanCard.test.tsx` — render with/without `source_campaign`, null phone → "No phone"
- `KanbanColumn.test.tsx` — label + count correct, `isOver` adds ring class

### E2E — Playwright (`tests/e2e/`)
- `admissions.spec.ts`:
  - `loads five columns with seeded leads`
  - `drags Jennifer from Inquiry to Tour Scheduled` (assert PATCH request + UI update)
  - `rolls back on network failure` (`route.abort` mid-drag)
  - `redirects root to /admissions`

### Suggested `.github/workflows/ci.yml`
```yaml
jobs:
  backend-lint:   composer install && ./vendor/bin/pint --test
  backend-test:   matrix PHP 8.3, services postgres:16, php artisan migrate --seed && php artisan test
  frontend-lint:  npm ci && npm run lint && npx tsc --noEmit
  frontend-test:  vitest run --coverage
  e2e:            docker-compose up -d && npx playwright test
  security:       composer audit && npm audit --production
```

---

## 📁 Project File Structure (updated)

```
C:\Users\Windows\eduflow\
├── backend/
│   ├── app/                          (Models, Controllers, Policies, Actions, Events, Listeners — all written)
│   ├── database/migrations/          ✅ FKs fixed in 005 + 006 (session 2)
│   ├── routes/api.php
│   ├── composer.json                 ⚠️ composer install NOT RUN
│   ├── .env.example                  ⚠️ .env not yet copied
│   └── Dockerfile
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                  ✅ NEW (session 2) — redirect to /admissions
│   │   ├── layout.tsx
│   │   └── (dashboard)/admissions/page.tsx  ✅ cleaned (session 2)
│   ├── components/admissions/
│   │   ├── KanbanCard.tsx
│   │   └── KanbanColumn.tsx          ✅ dedup constants (session 2)
│   ├── hooks/useLeads.ts             ✅ shared types + credentials (session 2)
│   ├── lib/
│   │   ├── utils.ts
│   │   └── constants.ts              ✅ NEW (session 2)
│   ├── types/
│   │   └── index.ts                  ✅ NEW (session 2) — was empty directory
│   └── .env.local                    NEXT_PUBLIC_API_URL=http://localhost:8000/api
│
├── mock-api.js                       ✅ REWRITTEN (session 2) — auth, students, sections, validation
├── docker-compose.yml
├── HANDOVER.md                       (this file)
└── README.md
```

---

## 🎯 Recommended Next Steps for OpenCode

### Priority 1 — Unblock backend (environmental)
1. Install PHP 8.3 + extensions (`pdo_pgsql`, `bcmath`, `gd`, `mbstring`, `curl`, `openssl`) OR install Docker Desktop.
2. `composer install` in `backend/` → commit `composer.lock`.
3. `cp .env.example .env && php artisan key:generate`.
4. Create `eduflow` Postgres DB, run `php artisan migrate --seed`.
5. Verify `php artisan serve --port=8000`, then swap `NEXT_PUBLIC_API_URL` off the mock.

### Priority 2 — Fix critical backend bugs
6. Rewrite `LeadController@index` ordering to be Postgres-compatible (no `FIELD()`).
7. Reconcile `Section` model — choose 1:1 or N:M for teachers, drop the other.
8. Add `HasUuids` to `Attendance` and `Grade` models (or change migrations to integer PKs consistently).

### Priority 3 — Wire up what's already written
9. Register policies in `AuthServiceProvider::$policies`.
10. Register `StudentAtRisk => NotifyCounselorOfRisk` in `EventServiceProvider::$listen`.
11. Fix `UpdateLeadStatusRequest::authorize()` to check role.
12. Add `throttle:60,1` middleware to `routes/api.php`.
13. Create `GetLeadsRequest` form request and inject into `LeadController@index`.

### Priority 4 — Complete RLS + Auth
14. Timestamp the RLS migration properly, add Postgres JWT claims setup.
15. Implement guardian passwordless login controller using existing `generatePasswordlessToken()`.
16. Build Sanctum SPA auth flow from frontend.

### Priority 5 — Tests (implement the list above in test pyramid order)
17. Unit → Feature → Policy → E2E. Use the suggested CI workflow.

### Priority 6 — Infra hardening
18. Add `.dockerignore` to backend and frontend.
19. Multi-stage frontend Dockerfile for production (`npm run build && npm start`).
20. docker-compose healthchecks on `db` and `backend`.
21. `env_file: .env` in docker-compose instead of hardcoded env.

---

## 📞 Open Questions (carried over)

1. Docker Desktop available on dev machine? (would simplify setup dramatically)
2. Which Stripe flows are needed? (Enrollment deposits? Tuition? Both?)
3. Meilisearch instance, or Laravel Scout file driver for dev?
4. Guardian passwordless login — magic links (email) or OTP (SMS)?
5. User roles beyond admin/counselor/teacher/guardian?

---

## 🔑 Test Credentials (mock API, seeded)

| Email | Role |
|---|---|
| admin@eduflow.test | admin |
| sarah@eduflow.test | counselor |
| emily@eduflow.test | counselor |
| tom@eduflow.test | teacher |
| lisa@eduflow.test | teacher |

Mock login: `POST /api/auth/login {email}` → returns `{token: "mock-<id>", user}`. No password check in mock.

---

*Session 1: Principal Full Stack Architect (via OpenCode) — architecture*
*Session 2: Claude Code — frontend fixes, mock API expansion, migration FK fixes, test plan*
*Prepared for: OpenCode / Senior Developer Team*
