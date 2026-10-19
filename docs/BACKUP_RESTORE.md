# Backup & restore (local)

## Backup

```bash
pnpm docker:up   # Postgres must be running
pnpm backup
```

Writes `./backups/bookverse-<timestamp>.sql` via `pg_dump`.

Uses host `pg_dump` when available; otherwise `docker compose exec postgres pg_dump` (local-first).

## Restore (tested procedure)

1. Stop API/worker writers if possible.
2. Ensure Docker Postgres is up: `pnpm docker:up`
3. Restore:

```bash
pnpm restore -- ./backups/bookverse-<timestamp>.sql
```

4. Re-generate client if schema drifted: `pnpm db:migrate`
5. Smoke: `pnpm --filter @bookverse/api exec curl -s http://127.0.0.1:4000/health` (or open `/health`)

## Redis persistence

`docker-compose.yml` runs Redis with `--appendonly yes` and a named volume `redis_data` (AOF persistence).
