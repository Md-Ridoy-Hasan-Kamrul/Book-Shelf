# Appendix B — Follow policy (BookVerse)

`canFollow(actor, target, ctx)` is the single source of truth. Enforced server-side; UI hiding is never security.

## Hard denials

| Rule                           | Code          |
| ------------------------------ | ------------- |
| Self-follow                    | `NOT_ALLOWED` |
| Blocked either direction       | `NOT_ALLOWED` |
| Target is `ADMIN` or `RIDER`   | `NOT_ALLOWED` |
| Actor/target banned or deleted | `NOT_ALLOWED` |

## Role matrix (actor → target)

| Actor \\ Target           | USER               | WRITER | PUBLISHER | VENDOR | ADMIN | RIDER |
| ------------------------- | ------------------ | ------ | --------- | ------ | ----- | ----- |
| USER                      | yes                | yes    | yes       | yes    | no    | no    |
| WRITER                    | follow-back only\* | yes    | yes       | no     | no    | no    |
| PUBLISHER                 | never              | yes    | yes       | no     | no    | no    |
| VENDOR                    | nobody             |        |           |        |       |       |
| ADMIN / MODERATOR / RIDER | nobody             |        |           |        |       |       |

\* `WRITER → USER` only when `ctx.actorIsFollowedByTarget` (user already follows the writer). Otherwise `FOLLOW_BACK_ONLY`.

## Extra rules

1. **Writer follow-back:** reverse-edge check + insert in **one** DB transaction (race-safe).
2. **Unfollow:** when a user unfollows a writer, the writer’s follow-back edge is removed.
3. **Block:** removes follows both ways and blocks new follows.
4. **Rate limit:** 50 follows / hour / user. Above 25 in the window, `trustScore` decrements (risk); never auto-ban.
5. **Publisher promos:** max 3 `ANNOUNCEMENT` posts / day. Sponsored posts always set `Post.isSponsored` and show a “Sponsored” label in the UI.
