# IDOR sweep — every route family (P17)

Legend: **Auth** = requireAuth; **Role** = requireRole; **Own** = ownership/seller check in service.

| Mount                     | Mutations / sensitive GETs | Protections                                |
| ------------------------- | -------------------------- | ------------------------------------------ |
| `/api/auth/*`             | sign-in/up                 | Better Auth + rate limit                   |
| `/me`                     | session                    | Auth cookie                                |
| `/users/:id/follow`       | follow/unfollow            | Auth + `canFollow` + block check           |
| `/role-applications`      | create / approve           | Auth; approve ADMIN only (idor tests)      |
| `/phone`                  | OTP                        | Auth + rate limit                          |
| `/posts`                  | create/react/comment       | Auth + rate; moderation ADMIN/MOD          |
| `/books`                  | public read                | —                                          |
| `/search`                 | read                       | Rate limit                                 |
| `/seller/*`               | listings/uploads           | Auth + seller role + sellerId ownership    |
| `/seller/dashboard/*`     | orders/earnings            | Auth + seller; order ownership (idor test) |
| `/admin/dashboard/*`      | KPIs, settings, DLQ, 2FA   | ADMIN + optional TOTP gate                 |
| `/admin/money/*`          | payouts/reconcile          | ADMIN                                      |
| `/reviews`                | create/helpful             | Auth; book scoped                          |
| `/wishlist`, `/bookshelf` | CRUD                       | Auth + userId                              |
| `/isbn`                   | lookup                     | SSRF guard                                 |
| `/used-listings`          | CRUD / near-me             | Auth + FEATURE + ownership                 |
| `/discover`               | mood/recommend             | Public read; log/classify Auth             |
| `/publisher/*`            | campaigns/offers           | FEATURE_SPONSORED + PUBLISHER ownership    |
| `/writer/*`               | beta/events                | FEATURE_LIVE_EVENTS + role/ownership       |
| `/checkout`, `/orders`    | money                      | Auth + buyer ownership                     |
| `/addresses`              | CRUD                       | Auth + userId                              |
| `/payments`               | intents                    | Auth                                       |
| `/webhooks/*`             | IPN/courier                | Provider verify + idempotency              |
| `/uploads`                | public GET by key          | Storage keys only                          |

Automated: `backend/src/auth.idor.test.ts`, `backend/src/dashboard.idor.test.ts`.
