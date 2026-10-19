# FUTURE_PLAN — BookVerse

Items to verify or enable before production. Do not implement here unless asked.

Copied/updated for P17 from prior `frontend/docs/FUTURE_PLAN.md`.

## Hosting & adapters

- `@astrojs/node` locally now; Cloudflare / Vercel / Render only when explicitly requested.
- Domain, paid SMS, live SSLCommerz, Steadfast, Pathao — env + provider swap after VERIFY.
- Dockerfiles prepared under `frontend/Dockerfile` and `backend/Dockerfile` (api + worker stages) — **not run** in local-first mode.

## VERIFY-BEFORE-LAUNCH

| Item                                                                                                        | Status (P17)                                                                              |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| SSLCommerz IPN `verify_sign` / IP allowlist — Order Validation API used; confirm IP range for prod firewall | **OPEN** — needs live merchant confirmation                                               |
| SSLCommerz session API field names (v4 `api.php`) vs current merchant doc                                   | **OPEN**                                                                                  |
| SSLCommerz sandbox Validation API reachability from CI/local                                                | **OPEN** — env-dependent                                                                  |
| Live-account IPN amount/currency rounding vs Decimal/paisa                                                  | **OPEN** — needs one real sandbox E2E                                                     |
| Payout bank transfer references — local batch marks ledger PAID only                                        | **OPEN** — real rails TBD                                                                 |
| Steadfast `create_order` / `status_by_cid` fields vs current merchant doc                                   | **OPEN**                                                                                  |
| Steadfast webhook auth (`Authorization: Bearer`) vs official model                                          | **OPEN**                                                                                  |
| Steadfast cancel shipment endpoint                                                                          | **NOT IMPLEMENTED**                                                                       |
| Pathao / RedX adapters                                                                                      | **STUB ONLY**                                                                             |
| LLM mood classify real provider (beyond `off`/`mock`)                                                       | **NOT IMPLEMENTED** — intentional local-first                                             |
| Admin 2FA enrollment enforced for all ADMIN before launch                                                   | **IMPLEMENTED locally** — enroll via `/admin/dashboard/2fa/*`; enforce when `totpEnabled` |
| Production CORS origins beyond localhost                                                                    | **OPEN** — env `WEB_ORIGIN`                                                               |
| k6 / capacity planning on target host                                                                       | **LOCAL ONLY** — see `docs/HARDENING_REPORT.md`                                           |
