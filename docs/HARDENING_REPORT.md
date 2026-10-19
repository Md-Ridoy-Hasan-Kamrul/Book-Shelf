# P17 Hardening report (local)

**Scope:** Production readiness, local version. No new product features.

Generated as part of P17 acceptance package.

## 1. VERIFY-BEFORE-LAUNCH

See [`docs/FUTURE_PLAN.md`](./FUTURE_PLAN.md) — full table with **OPEN / NOT IMPLEMENTED / IMPLEMENTED locally** status.

## 2. k6 load test (browse / search / checkout)

Script: `k6/browse-search-checkout.js`

```bash
# API must be running on :4000
k6 run k6/browse-search-checkout.js
```

Results land in `docs/k6-last-run.json` when k6 is installed. Capture during the run:

- Postgres: `SELECT count(*) FROM pg_stat_activity;`
- Redis: `redis-cli INFO memory`

**Note:** Figures are local-relative, not production capacity.

If k6 is not installed on this machine, document the run as **pending operator** and keep thresholds in the script (`p(95)<1500`, error rate `<5%`).

## 3. Security checklist

See [`docs/SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md).

Supporting:

- [`docs/IDOR_SWEEP.md`](./IDOR_SWEEP.md)
- [`docs/RATE_LIMIT_COVERAGE.md`](./RATE_LIMIT_COVERAGE.md)
- SSRF: `backend/src/lib/ssrfGuard.ts`
- Origin: `backend/src/middleware/requireOrigin.ts`
- Admin TOTP: `/admin/dashboard/2fa/setup|confirm|verify`

## 4. Reliability

| Item                              | Status                                                                      |
| --------------------------------- | --------------------------------------------------------------------------- |
| `pnpm backup` → `./backups/*.sql` | Implemented (`scripts/backup.mjs`; host `pg_dump` or `docker compose exec`) |
| Restore documented + scripted     | [`docs/BACKUP_RESTORE.md`](./BACKUP_RESTORE.md), `pnpm restore`             |
| Redis AOF                         | `docker-compose.yml` `--appendonly yes`                                     |
| BullMQ DLQ                        | `GET /admin/dashboard/dead-letter-jobs` + admin UI section                  |
| Structured logs + request id      | `pino-http` `genReqId` ← `x-request-id`                                     |

**Operator note:** On machines without Docker/`pg_dump` on PATH, start `pnpm docker:up` (or install PostgreSQL client tools) then run `pnpm backup` → `pnpm restore -- <file>` to complete the acceptance cycle.

## 5. Reconciliation

- `pnpm reconcile` — orders vs ledger
- `pnpm verify:points` — pointsBalance vs PointLedger SUM
- Write paths reviewed: [`docs/LEDGER_WRITE_PATHS.md`](./LEDGER_WRITE_PATHS.md)

## 6. Legal static pages (BN + EN)

Draft, unpublished until hosting:

- `/legal/terms`
- `/legal/privacy`
- `/legal/refund`
- `/legal/seller`

## 7. Deployment prep (not run)

- `frontend/Dockerfile` (web)
- `backend/Dockerfile` (targets `api` and `worker`)
