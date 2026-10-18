# FUTURE_PLAN — BookVerse

Items to verify or enable before production. Do not implement here unless asked.

## Hosting & adapters

- `@astrojs/node` locally now; Cloudflare / Vercel / Render only when explicitly requested.
- Domain, paid SMS, live SSLCommerz, Steadfast, Pathao — env + provider swap after VERIFY.

## VERIFY-BEFORE-LAUNCH

- **SSLCommerz IPN `verify_sign` / IP allowlist** — we validate via official Order Validation API (`val_id`); confirm IP range policy for production firewall.
- **SSLCommerz session API field names** — session create uses v4 `api.php`; re-verify against current merchant doc before live keys.
- **SSLCommerz sandbox Validation API availability** from CI/local networks (some environments block outbound HTTPS).
- **Live-account IPN amount/currency rounding** vs our `Decimal(12,2)` / paisa rules — run one real sandbox transaction end-to-end.
- **Payout bank transfer references** — local batch only marks ledger `PAID`; real payout rails TBD.
- **Steadfast `create_order` / `status_by_cid` request & response fields** — adapter uses portal.packzy.com sandbox; re-verify against current merchant API doc before live keys.
- **Steadfast webhook auth** — we expect `Authorization: Bearer <STEADFAST_WEBHOOK_BEARER_TOKEN>`; confirm official webhook security model.
- **Steadfast cancel shipment endpoint** — not implemented (`VERIFY-BEFORE-LAUNCH`).
- **Pathao / RedX** — stubs only; full adapter after official docs review.
