# Rate-limit coverage report (P17)

Implementation: `consumeRateLimit(env, key, limit, windowSeconds)` via Redis (`backend/src/lib/rateLimit.ts`). Skipped when `NODE_ENV=test` && `HEALTH_SKIP_INFRA`.

| Surface           | Key pattern    | Limit / window                      | File                        |
| ----------------- | -------------- | ----------------------------------- | --------------------------- |
| Auth              | auth IP        | via `createAuthRateLimitMiddleware` | `routes/follow.ts` (shared) |
| Follow            | follow:user    | yes                                 | `routes/follow.ts`          |
| Posts create      | post:user      | yes                                 | `routes/posts.ts`           |
| Search            | search:ip      | yes                                 | `routes/search.ts`          |
| Checkout          | checkout:user  | yes                                 | `routes/checkout.ts`        |
| Phone OTP         | otp:…          | yes                                 | `routes/phoneOtp.ts`        |
| Mood LLM classify | mood-llm:user  | 10 / 3600s                          | `moodClassifyService.ts`    |
| Live chat         | live-chat:user | 20 / 60s                            | `realtime/liveRoom.ts`      |
| Live questions    | live-q:user    | 5 / 60s                             | `realtime/liveRoom.ts`      |

**Gap (accepted local):** browse `/books` list is Cache-Control only (no Redis limit) — fine for local; add edge limit at host later.
