# Favorites

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

Idempotent save/remove for visible listings with a database-backed unique user/listing relationship.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/favorites` | Authenticated | Paginate favorites whose listings remain public |
| `PUT` | `/api/favorites/:id` | Authenticated | Save public listing idempotently |
| `DELETE` | `/api/favorites/:id` | Authenticated | Remove relationship idempotently |

## How the implementation works

1. Authenticated user requests favorite on a published nondeleted listing.
2. Service enforces visibility before updating Favorites.
3. PUT upserts via `$setOnInsert`; unique `(user,listing)` index resolves concurrency/retry duplicates.
4. GET finds current user favorites, populates visible target listings, and hides unavailable targets.
5. DELETE for a user/listing pair is safe to repeat even when record does not exist.

## Invariants and exact boundaries

- PUT and DELETE express desired state rather than side effects.
- Favorite does not grant access to a later-unpublished/sold/deleted target.
- The `(user,listing)` unique index is authoritative against races.
- Read filtering may mean fewer visible items than the page size if hidden targets remain referenced.

## Database responsibilities

- Favorite: user ref, listing ref; unique compound index `(user,listing)`.
- Listing published/nondeleted predicate protects reads and writes.

## Request or design example

```http
PUT /api/favorites/<published-ad-id>
Authorization: Bearer <access-token>
```

```http
GET /api/favorites?page=1&limit=20
Authorization: Bearer <access-token>
```

```http
DELETE /api/favorites/<ad-id>
Authorization: Bearer <access-token>
```

## Verification checklist

- [ ] PUT twice results in one Favorite document.
- [ ] Two concurrent PUTs do not create two records.
- [ ] DELETE twice succeeds with removal intention preserved.
- [ ] Private/draft listing cannot be favorited.
- [ ] A sold listing disappears from favorite results despite existing join record.

## Common mistakes

- Using check-then-insert instead of unique index/upsert.
- Assuming a favorite relationship implies permanent public visibility.
- Leaking a hidden listing through populate results.

## Practical assignment

Produce before/after database counts for duplicate PUT, repeated DELETE, and public-to-sold transitions. Explain how uniqueness and idempotence are related but not identical.

## Source files to inspect

- `src/models/index.js`
- `src/services/marketplace.js`
- `src/routes/`
- `tests/core.test.js`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
