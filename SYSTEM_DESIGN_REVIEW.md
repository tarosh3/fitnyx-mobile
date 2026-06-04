# FitNyx — System Design Review

> Snapshot date: 2026-05-16
> Status: pre-launch, no users yet
> Goal: scalable architecture, correctness now, easy growth later

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [What's Correct ✅](#whats-correct-)
3. [What's Wrong ❌](#whats-wrong--active-issues-fix-before-scale)
4. [What's Missing ⚠️](#whats-missing--not-bugs-but-absent)
5. [What Could Be Better 🔄](#what-could-be-done-better-)
6. [Scale Milestones](#scale-milestones-pre-launch--100k-users)
7. [TL;DR Action Plan](#tldr)

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                                            │
│                                                                                     │
│  ┌────────────────────────┐    ┌────────────────────────┐                           │
│  │  Mobile (iOS/Android)  │    │  Admin Web             │                           │
│  │  React Native 0.83     │    │  Next.js 16 (Vercel?)  │                           │
│  │  Expo SDK 55, New Arch │    │  React 19, Tailwind 4  │                           │
│  │                        │    │  shadcn/ui             │                           │
│  │  • Expo Router         │    │  • Prisma 7 (direct DB)│                           │
│  │  • AsyncStorage cache  │    │  • Separate JWT auth   │                           │
│  │  • Offline queue       │    │                        │                           │
│  │  • Notifee FG service  │    │                        │                           │
│  │  • iOS Live Activity   │    │                        │                           │
│  │  • Supabase JS client  │    │                        │                           │
│  │  • Sentry RN           │    │                        │                           │
│  └───────┬────────────────┘    └───────┬────────────────┘                           │
└──────────┼─────────────────────────────┼────────────────────────────────────────────┘
           │ HTTPS                       │ HTTPS
           │ Bearer JWT (Supabase)       │ Bearer JWT (admin)
           │ sentry-trace header         │
           ▼                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  AUTH BOUNDARY                                                                      │
│                                                                                     │
│  ┌────────────────────────────────────────────────────────────────────────────┐     │
│  │  Supabase Auth — PKCE flow, JWKS-verified JWTs, refresh rotation           │     │
│  └────────────────────────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────┬────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  APPLICATION TIER                                                                   │
│                                                                                     │
│  ┌────────────────────────────────────────────────────────────────────────────┐    │
│  │  Backend API — Go 1.24 + Echo v4   (single Docker container, :8080)        │    │
│  │                                                                            │    │
│  │  Middleware: sentryecho → Logger → Recover → CORS(*) → JWKS-verify →       │    │
│  │              Session lookup → RateLimit (Redis token bucket)               │    │
│  │                                                                            │    │
│  │  Handlers → Services → Repos (interface DI)                                │    │
│  │  Domain: auth · users · workouts · exercises · agent · dashboard · admin   │    │
│  └────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                     │
└────┬──────────────┬───────────────┬───────────────┬───────────────┬────────────────┘
     │              │               │               │               │
     │ pgx          │ go-redis      │ HTTPS         │ HTTPS         │ HTTPS
     │ (PGBouncer)  │ RESP3 + TLS   │ (sentry-trace)│ (Sentry SDK)  │
     ▼              ▼               ▼               ▼               ▼
┌─────────┐   ┌────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐
│Supabase │   │ Upstash    │  │ NVIDIA NIM   │  │ Sentry   │  │ Cloudinary CDN   │
│Postgres │   │ Redis      │  │ Llama 3.1 70B│  │  SaaS    │  │  (URLs in DB,    │
│         │   │            │  │              │  │          │  │   read direct    │
│ shared  │   │ • cache    │  │ • Coach Filo │  │ • errors │  │   from mobile)   │
│ across  │   │ • ratelim  │  │ • daily ins. │  │ • traces │  │                  │
│ all 3   │   │ • session  │  │ • threads    │  │ • releas │  │ • exercise vids  │
│ repos   │   │ • AI quota │  │              │  │          │  │ • exercise gifs  │
│         │   │            │  │ 10 req/min   │  │ free tier│  │                  │
│ RLS,    │   │ free tier  │  │  /user       │  │ 5k/mo    │  │ free tier        │
│ soft-del│   │            │  │              │  │          │  │ 25GB/mo          │
└─────────┘   └────────────┘  └──────────────┘  └──────────┘  └──────────────────┘
```

### Component summary

| Component | Tech | Status | Role |
|-----------|------|--------|------|
| Mobile | RN 0.83, Expo SDK 55 | ✅ active | iOS/Android client |
| Admin Web | Next.js 16, Prisma 7 | ✅ active | Internal management |
| Backend API | Go 1.24, Echo v4, GORM | ✅ active | REST API |
| Postgres | Supabase managed | ✅ active | Source of truth |
| Redis | Upstash free tier | ✅ active | Cache + ratelimit |
| Auth | Supabase Auth | ✅ active | JWT/JWKS |
| AI | NVIDIA NIM (Llama 3.1 70B) | ✅ active | Coach Filo |
| CDN | Cloudinary | ✅ active | Exercise media |
| Errors/Tracing | Sentry SaaS | ✅ active (just wired) | Observability |
| Storage | Supabase Storage | ❌ unused | (no upload flow) |
| Push | FCM/APNs | ❌ unwired | (Firebase configured) |
| Email | Supabase Auth only | ⚠️ partial | No transactional |
| Payments | — | ❌ missing | `subscription_tier` unenforced |
| Analytics | — | ❌ missing | |
| Uptime | — | ❌ missing | (recommended: UptimeRobot free) |

---

## What's CORRECT ✅

| # | Decision | Why right |
|---|----------|-----------|
| 1 | **Three-tier separation** (mobile/admin/backend) | Clean. Mobile + admin can't talk to each other. Backend is single source of truth. |
| 2 | **Supabase Auth for mobile** | Don't roll your own. PKCE + JWKS + refresh rotation are subtle to get right. |
| 3 | **JWKS verify in middleware** | Stateless auth — no auth DB lookup per request. Cached JWKS = ~microsecond verify. |
| 4 | **Repository pattern + interfaces in Go** | Swap DB later, test without DB. Clean DI. |
| 5 | **GORM through PGBouncer w/ simple protocol** | Critical — Supabase pooler doesn't support prepared statements. Got this right. |
| 6 | **Cloudinary URLs in DB, direct streaming** | Right pattern. Backend never proxies media. |
| 7 | **Redis-backed rate limit by user_id** | Per-user not per-IP. Survives restarts. Standard. |
| 8 | **AI rate limit (10/min) + daily insight cache** | NIM is most expensive call. Quota + cache = right approach. |
| 9 | **Offline queue in AsyncStorage** | Mobile users go offline mid-gym. Queue + replay = good UX. |
| 10 | **Soft deletes via GORM** | Auditable. Easy data recovery. |
| 11 | **Cached query hooks (`useCachedQuery`)** | Stale-while-revalidate per component. Avoid prop-drilling fetched data. |
| 12 | **Sentry distributed tracing (just wired)** | One trace per user action, mobile→backend stitched. Industry standard. |
| 13 | **Notifee for workout foreground service** | Required on Android for background timer accuracy. Right tool. |
| 14 | **iOS Live Activity for Dynamic Island** | Best-in-class iOS UX for active sessions. |
| 15 | **AI thread + message persistence** | User can resume Filo conversations. Good UX, low compute cost. |

---

## What's WRONG ❌ (active issues, fix before scale)

| # | Issue | Risk | Fix |
|---|-------|------|-----|
| 1 | **CORS: `*`** | Any malicious site can read auth'd responses. Critical for production. | Lock to `https://fitnyx.app, https://admin.fitnyx.app` via `CORS_ORIGINS` env. |
| 2 | **Admin uses Prisma direct to shared DB** | Two ORMs (Prisma + GORM) on same schema = schema drift risk. Migration via SQL but Prisma generates its own client. | Either: (a) admin calls backend API only, (b) document Prisma is read-only mirror — currently neither enforced. |
| 3 | **Single Echo instance, no LB** | One container = single point of failure. Restart = downtime. | Deploy 2+ replicas behind LB (Fly.io / Railway / Cloud Run all do this trivially). |
| 4 | **Two admin auth systems (Supabase + custom JWT)** | Doubles attack surface. Custom JWT issuance is error-prone. | Migrate admin to Supabase Auth w/ `is_admin` role check. Single auth path. |
| 5 | **AutoMigrate disabled but GORM struct tags still exist** | Schema source of truth is now `migration_*.sql`, but devs may edit struct tags expecting them to apply. | Add comment header to each model: `// SCHEMA SOURCE OF TRUTH: migration_*.sql — struct tags below are for query mapping only`. |
| 6 | **No request timeout in Echo** | A hanging Postgres query holds a goroutine forever. Slow OOM. | `e.Server.ReadTimeout = 15s`, `WriteTimeout = 30s`, per-handler `context.WithTimeout` for DB calls. |
| 7 | **No graceful shutdown** | Container SIGTERM = in-flight requests dropped, Sentry events lost. | `e.Shutdown(ctx)` on SIGTERM + `sentry.Flush(2s)`. |
| 8 | **Bundle IDs `com.fitnyx.app` set** but Expo `eas.json` missing | No prod build config. Can't ship to stores yet. | Add `eas.json` + EAS Build setup. |
| 9 | **Refresh Token error surfaces as red LogBox in dev** | Not a real bug but pollutes Sentry quota too once `enabled` in prod. | Already added to `beforeSend` filter ✓ but verify `AuthProvider` catches and silently `signOut()`. |
| 10 | **NIM API key probably in `.env`, no rotation** | If leaked, attacker spends your AI budget. | Rotate quarterly, store in secret manager (Doppler/1Password) not git-tracked `.env`. |
| 11 | **`.env` committed to git history likely contains secrets** | Audit `git log --all -p -- .env`. | `git filter-repo` if found. Move to secret manager. |
| 12 | **No DB connection pool limits set on GORM** | Defaults can exhaust Supabase pool under load. | `sqlDB.SetMaxOpenConns(20)`, `SetMaxIdleConns(5)`, `SetConnMaxLifetime(5m)`. |
| 13 | **Slow SQL on `/dashboard` (sessions query 260ms × 3)** | Same session row fetched 3× per request. N+1 or repeated middleware lookup. | Inspect — likely Session middleware fetching every protected route + handler re-fetching. Cache in `c.Set("session", obj)` once. |

---

## What's MISSING ⚠️ (not bugs, but absent)

### Infrastructure / Ops

- **CI/CD** — `.github/` untracked, no GitHub Actions. Manual deploys = error-prone.
- **No staging environment** — only dev + (eventually) prod. No place to test migrations safely.
- **Secret management** — `.env` files. Should be Doppler / Vault / cloud-native secrets.
- **Infrastructure as code** — no Terraform / Pulumi for Upstash/Supabase config. Manual setup = un-reproducible.
- **Database backups verification** — Supabase auto-backups exist, but never test-restored. "Backups you haven't restored aren't backups."
- **Log aggregation** — `log.Printf` to stdout. Fine for one container, breaks at scale. Need Loki / CloudWatch / Sentry breadcrumbs already cover some of this.
- **Metrics (RED/USE)** — request rate, error rate, duration. Sentry has it, but no Prometheus/Grafana for infra metrics (CPU, memory, conn pool saturation).

### Testing

- **Zero tests** — no `*_test.go`, no Jest. Refactoring is Russian roulette.
- **No E2E** — Maestro / Detox not wired. Login flow could regress silently.
- **No load testing** — k6 / Artillery never run. Don't know breaking point.
- **No contract tests between mobile + backend** — API drift is a silent bug breeder.

### Code quality

- **No linting** — `golangci-lint` Go, `eslint` mobile. Style drift across the codebase.
- **No pre-commit hooks** — formatting, lint, type-check should block bad commits.
- **No PR review pipeline** — solo dev habit. Bring in `caveman-reviewer` or codeowners for sanity checks.

### Performance / Scalability

- **No CDN in front of backend API** — every mobile→backend call hits origin. Cloudflare in front of Echo = free DDoS protection + edge cache for `GET /exercises` (read-heavy, rarely changes).
- **No DB read replicas** — Supabase Pro supports them. Move analytics/dashboard queries off primary.
- **No background job queue** — daily insight generation, AI thread summarization happen synchronously in request path. Move to Asynq / River Queue / Cloud Tasks.
- **No event bus** — user signed up → onboarding email → analytics event → CRM sync. All currently coupled. Pub/sub (Redis Streams / NATS) decouples.
- **No idempotency keys** — POST /workout-sessions could double-create on retry. Add `Idempotency-Key` header pattern.
- **No request deduplication on mobile** — rapid tap = N identical requests. SWR / React Query dedupes; you have custom hook.

### Security

- **No WAF / DDoS protection** — Cloudflare free in front of API solves this.
- **No SAST / DAST scanning** — Snyk / Semgrep should run on PRs.
- **No dependency vulnerability scanning** — `npm audit` failed earlier silently. Add Dependabot.
- **No CSP / security headers on admin** — `helmet.js` for Next.js.
- **No PII data classification** — GDPR/CCPA require knowing what's PII. No data map.
- **No audit log** — can't answer "who changed user X's email at 3am?"
- **Supabase RLS exists** — but unverified for every table. Audit needed.

### Product / Feature

- **No push notifications wired** — Firebase configured but unused. Workout reminders, AI coach pings missing.
- **No analytics** — no PostHog / Amplitude / Mixpanel. Don't know what users do.
- **No A/B testing infra** — GrowthBook / Statsig free tier. Useful pre-launch.
- **No feature flags** — every deploy is all-or-nothing rollout.
- **No email service** — Supabase sends auth emails, but no transactional (Resend / Postmark) for "Workout streak day 30!" emails.
- **No payment integration** — `subscription_tier` exists (free/premium/pro) but unenforced. Stripe / RevenueCat needed.

---

## What could be done BETTER 🔄

### 1. Backend deployment

**Current:** Dockerfile, presumably deployed to one host.

**Better:**
- Fly.io / Railway / Cloud Run — auto-scale 0→N based on load
- Multi-region (start: 1 region = closest to your users; add region per major user cluster)
- Health check at `/health` already exists ✓
- Blue/green deploys via platform

### 2. Mobile API client

**Current:** `fetchWithAuth()` wrapper, manual retry, custom cache hook.

**Better:**
- **TanStack Query (React Query)** — battle-tested cache, dedup, retry, optimistic updates. Your `useCachedQuery` is reinventing this with 1% of the features. Migration = 2 days, value = years.
- Mobile becomes thinner. Less code to maintain.

### 3. Schema management

**Current:** Hand-written SQL migration files + GORM struct tags drifting.

**Better:**
- **Atlas** (https://atlasgo.io) or **golang-migrate** — versioned, reversible migrations
- Single source: generate GORM models from schema OR generate schema from models, not both
- Migration runs in CI before deploy, blocks bad migrations

### 4. AI cost control

**Current:** 10 req/min per user, daily insight cached.

**Better:**
- **Prompt caching** — NIM/OpenAI/Anthropic all support cache. System prompt (Filo persona, instructions) is identical across users → cache it. **40-90% input token savings.**
- **Streaming** — currently probably batch response. Stream tokens = better UX, same cost.
- **Smaller model for triage** — Llama 8B for "is this fitness-related?" gate, 70B only for actual coaching response. Halve cost.
- **Summarize threads at N messages** — context grows linearly otherwise. Truncate + summary at 20 messages.

### 5. Observability

**Current:** Sentry just wired. Console.log everywhere.

**Better:**
- Structured logging — `zerolog` Go, `pino` if backend ever does Node. Already JSON in some places, fragmented.
- Add `correlation_id` (trace_id from Sentry header) to every log line — grep across mobile + backend by single ID.
- **PostHog free tier** — product analytics + session replay. Complements Sentry.

### 6. Cache strategy

**Current:** Redis cache w/ TTLs (SHORT/MEDIUM/LONG/DAY). Sensible.

**Better:**
- Add `stale-while-revalidate` semantics — return stale + refresh async (your mobile does this, backend doesn't)
- Cache invalidation on write — currently TTL-only. Adds eventual-consistency window. Fine for now, audit later.
- **Edge caching at Cloudflare** for `GET /exercises` (rarely changes) — offloads Redis entirely

### 7. Mobile state

**Current:** 4 React Context providers (Auth, Theme, Workout, AICoach).

**Better:**
- Contexts re-render entire subtree on update. Workout timer ticking every sec re-renders consumers.
- **Zustand / Jotai** for state, Context only for static config.
- Or split WorkoutProvider into `useWorkoutSession` (rarely changes) + `useWorkoutTimer` (ticks) consumers.

### 8. Type safety mobile↔backend

**Current:** TypeScript types manually duplicated from Go structs.

**Better:**
- **OpenAPI spec** as source of truth → generate Go handlers + TS types
- Or **tRPC** if you ever go full-stack TS (not your case)
- Or **Buf + Connect** — Protobuf-based, generates Go + TS clients. Heavy but bulletproof.

### 9. Push notification stack

**Current:** Notifee local-only, FCM unwired.

**Better:**
- **Expo Push Notifications** — free, abstracts FCM+APNs, scales free up to high volume
- Backend stores `expo_push_token` per user
- Trigger from background job ("workout reminder 6pm")

### 10. CDN strategy

**Current:** Cloudinary for media. Direct DB URLs.

**Better:**
- Add **Cloudflare in front of API** — free DDoS + edge cache for read-heavy GET routes
- Cloudinary transformations (`q_auto,f_auto,w_720`) — 50% bandwidth savings
- Store `cloudinary_public_id` not full URL → swap CDN later without DB rewrite

---

## Scale milestones (pre-launch → 100k users)

```
Stage 1 — Pre-launch (now)                 Stage 2 — 0-1k DAU
─────────────────────────────              ─────────────────────────────
Fix:                                       Add:
 ✓ CORS lockdown                            • Cloudflare in front of API
 ✓ Tests (auth, payments path)              • Push notifications
 ✓ Graceful shutdown                        • Analytics (PostHog)
 ✓ DB pool config                           • E2E test for critical flow
 ✓ Eliminate session N+1                    • EAS Build + store submission
 ✓ Eas.json + store metadata                • Stripe / RevenueCat


Stage 3 — 1k-10k DAU                        Stage 4 — 10k-100k DAU
─────────────────────────────              ─────────────────────────────
 • Background job queue                     • Read replicas for analytics
 • Backend → 2+ replicas + LB               • Multi-region deploy
 • DB query optimization pass               • Event bus (Redis Streams)
 • AI prompt caching                        • Dedicated Sentry tier ($$)
 • Sentry tighter sampling                  • OpenTelemetry pipeline
 • Cloudinary transforms                    • Postgres partitioning
 • Migrate admin to Supabase Auth           • Read-heavy caching layer


Stage 5 — 100k+ DAU
─────────────────────────────
 • Sharded Postgres OR move analytics to OLAP (ClickHouse / BigQuery)
 • Multiple AI providers w/ fallback (NIM down → OpenAI failover)
 • Dedicated Redis cluster (not Upstash free tier)
 • CDN-cached personalized data via stale-while-revalidate at edge
 • Service split: monolith → workout/AI/billing separate services
```

---

## TL;DR

**Architecture is solid for stage 1.** Right patterns: stateless auth, repo pattern, CDN-fronted media, queued offline writes, distributed tracing wired.

### Before launch — MUST FIX

1. CORS lockdown (`CORS_ORIGINS` env to real domains)
2. Graceful shutdown + request timeouts
3. DB pool config (`SetMaxOpenConns`, `SetConnMaxLifetime`)
4. Tests on auth + payment paths
5. Push notifications (drives retention)
6. Stripe / RevenueCat integration (revenue gate)
7. EAS Build config (can't ship without)
8. Audit `.env` git history for leaked secrets

### Pre-1k DAU — SHOULD FIX

- Cloudflare in front of API (free DDoS + cache)
- Analytics (PostHog free)
- Lint/CI pipeline (GitHub Actions)
- AI prompt caching (cost reduction)
- Eliminate the 3× session query N+1 on `/dashboard`
- Migrate admin to Supabase Auth (kill custom JWT)

### Don't over-engineer now

- Event bus
- Microservices
- OpenTelemetry pipeline
- Sharding
- Read replicas

All premature at this stage. Build when pain is real.

---

## Open questions for you

1. **Hosting target for backend?** Fly.io / Railway / Cloud Run / DigitalOcean App? Affects deploy strategy.
2. **Launch markets?** Affects region choice + GDPR scope.
3. **Monetization model?** Affects when to wire Stripe.
4. **Target DAU at launch?** Affects which Stage 2 items to prioritize.
5. **Web app planned?** Currently only mobile + admin — public marketing site separate?

---

_Generated 2026-05-16. Re-review after each major architecture change._
