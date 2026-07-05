---
name: test-app
description: Run and write tests for FitNyx — mobile Jest suite, TypeScript type-check, CI parity checks, and backend Go tests. Use when asked to test, verify, type-check, or reproduce CI locally.
---

# Test FitNyx

## Mobile (this repo)

```bash
npm test                       # Full Jest suite
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage (collects from src/**/*.{ts,tsx})
npx jest path/to/file.test.ts  # Single file
npx jest -t "test name"        # Single test by name
npx tsc --noEmit               # Type-check
```

### CI parity — run all three before pushing (mirrors `.github/workflows/ci.yml`)

```bash
npx tsc --noEmit && npm test -- --passWithNoTests && npx expo export --platform web
```

CI runs on push/PR to `main` and `staging`.

### Jest setup notes
- Preset `jest-expo`, config in `jest.config.js`, setup in `jest.setup.js` (mocks `expo-secure-store` among others).
- `@/` alias maps to repo root via `moduleNameMapper`.
- If a new native/expo package breaks Jest with "Cannot use import statement outside a module", add it to `transformIgnorePatterns` allowlist in `jest.config.js`.
- Existing tests live in `__tests__/` dirs beside code: `src/components/ui/__tests__/`, `src/hooks/__tests__/`, `src/lib/__tests__/`, `src/lib/cache/__tests__/`, `src/lib/config/__tests__/`. New tests follow that pattern.

## Backend (Go)

```bash
cd /Users/taroshmathuria/FitNyx/backend
make test                       # go test ./...
make test-verbose               # -v
make test-cover                 # coverage.html report
make test-race                  # race detector
make test-pkg PKG=./internal/service
make test-run RUN=TestName
```

Tests live beside code as `*_test.go` in `internal/handlers/` and `internal/service/` (mocks in `handlers/mocks_test.go`). Backend has no CI yet — always run `make test` before committing backend changes.

## Admin dashboard

No tests yet. `npm run lint` (eslint) and `npm run build` are the only checks.
