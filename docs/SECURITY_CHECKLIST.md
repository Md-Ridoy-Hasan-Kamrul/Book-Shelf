# Security checklist (P17 — OWASP-oriented, local)

| Control                       | Status                            | Notes                                                |
| ----------------------------- | --------------------------------- | ---------------------------------------------------- |
| Dependency audit              | Script: `pnpm audit:deps`         | Run before launch; triage high/critical              |
| Helmet headers                | OK                                | `app.use(helmet())`                                  |
| CORS credentials + WEB_ORIGIN | OK                                | Strict origin                                        |
| Origin check on mutations     | OK                                | `requireOrigin` after JSON (webhooks exempt)         |
| Upload MIME + size            | OK                                | `assertImageUpload` jpeg/png/webp + max bytes        |
| SSRF ISBN / covers            | OK                                | `ssrfGuard` allowlist + `safeFetch`                  |
| Raw SQL                       | Reviewed                          | Prisma parameterized; `$queryRaw` uses `Prisma.join` |
| Mass assignment               | OK                                | Better Auth `role`/`pointsBalance` `input: false`    |
| IDOR sweep                    | See `docs/IDOR_SWEEP.md`          | Tests: `auth.idor`, `dashboard.idor`                 |
| Rate limits                   | See `docs/RATE_LIMIT_COVERAGE.md` | Redis `consumeRateLimit`                             |
| Admin 2FA (TOTP)              | OK                                | `/admin/dashboard/2fa/*` + gate when enabled         |
| Secrets in git                | OK                                | `.env` gitignored; `.env.example` only               |
| No stack traces in API        | OK                                | Envelope errors                                      |
