---
name: db-migrate
description: Make a FitNyx database schema change safely across all three repos — SQL migration in the Go backend, GORM model update, admin Prisma sync, and mobile type alignment. Use for any schema change, new table, new column, or index.
---

# Database schema changes (cross-repo)

**Ownership rule: the Go backend owns the schema.** Admin (Prisma) and mobile follow, never lead. AutoMigrate is removed from the backend — nothing auto-syncs; every change is an explicit SQL migration.

## Order of operations — follow exactly

### 1. Write the SQL migration (Go backend)

- File: `migration_<description>.sql` in `/Users/taroshmathuria/FitNyx/backend` root (match existing `migration_*.sql` naming).
- Raw SQL is allowed here — this is the one exception to the "never write raw SQL" rule.
- Include indexes for anything queried at scale (existing migrations added pg_trgm/word_similarity and workout indexes — follow that pattern).

### 2. Apply the migration

```bash
cd /Users/taroshmathuria/FitNyx/backend
go run ./cmd/migrate/main.go     # or paste SQL into Supabase SQL editor
```

Confirm the column/table exists before touching any code (query via a quick `psql`/Supabase check).

### 3. Update GORM models (Go backend)

- Edit `internal/models/` to mirror the new schema. GORM soft deletes (`deleted_at`) on entities.
- Update repository, service, handler as needed (Handler → Service → Repository, interface first).
- Verify: `make test`.

### 4. Sync admin dashboard (only if admin reads the changed table)

- Edit `prisma/schema.prisma` **manually** to mirror the change — do NOT run `prisma db pull` (it would rewrite the whole schema file).
- Then: `npx prisma generate` (client outputs to `src/generated/prisma`).
- **NEVER `prisma migrate`.** `prisma db push` is allowed ONLY for admin-owned tables (`admin_audit_logs`) — never for shared tables (the migration in step 2 already changed the DB).
- Verify: `npm run build`.

### 5. Sync mobile types (only if the API response shape changed)

- Update TS types in `src/lib/api/<domain>.ts` to match the Go handler's JSON.
- Invalidate/adjust affected cache keys in `src/lib/cache/keys.ts` if the cached shape changed.
- Verify: `npx tsc --noEmit && npm test`.

## Checklist before calling it done

- [ ] Migration file committed in backend repo root
- [ ] Migration applied to Supabase (verified, not assumed)
- [ ] GORM models match; `make test` green
- [ ] Admin schema.prisma mirrors change (if admin touches the table); `npm run build` green
- [ ] Mobile types match handler JSON; `npx tsc --noEmit` green
- [ ] No repo left mid-sync — a schema change is one logical task across all repos
