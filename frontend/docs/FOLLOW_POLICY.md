# Appendix B — Follow policy (BookVerse)

`canFollow(actor, target, ctx)` is the single source of truth. Routes must call this before any follow write.

## Hard denials (any roles)

| Rule                                        | Result                   |
| ------------------------------------------- | ------------------------ |
| `actor.id === target.id`                    | deny (`SELF`)            |
| `ctx.blocked === true` (either direction)   | deny (`BLOCKED`)         |
| `actor.bannedAt` or `actor.deletedAt` set   | deny (`ACTOR_INACTIVE`)  |
| `target.bannedAt` or `target.deletedAt` set | deny (`TARGET_INACTIVE`) |

## Role matrix (actor → target)

`yes` = follow allowed if hard rules pass.

| Actor \\ Target | USER   | WRITER | PUBLISHER | VENDOR | ADMIN | MODERATOR |
| --------------- | ------ | ------ | --------- | ------ | ----- | --------- |
| USER            | yes    | yes    | yes       | yes    | no    | no        |
| WRITER          | yes    | yes    | yes       | yes    | no    | no        |
| PUBLISHER       | **no** | yes    | yes       | yes    | no    | no        |
| VENDOR          | yes    | yes    | yes       | yes    | no    | no        |
| ADMIN           | yes    | yes    | yes       | yes    | yes   | yes       |
| MODERATOR       | yes    | yes    | yes       | yes    | no    | yes       |

Deny reason when matrix says no: `ROLE_POLICY`.

## Follow-back (writers)

When a **USER** follows a **WRITER**, the API also creates `WRITER → USER` in the same transaction (follow-back).

**Unfollow:** deleting `USER → WRITER` also deletes the writer’s follow-back edge `WRITER → USER` if it exists.

## Block

Creating a block removes **both** follow directions between the two users (handled in block service when implemented; follow module assumes `ctx.blocked`).
