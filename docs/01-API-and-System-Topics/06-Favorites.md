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

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

### Unique favorite relationship

**File illustrated:** `src/models/index.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
}, { timestamps: true });
// Database uniqueness is the final race-safe duplicate guard.
schema.index({ user: 1, listing: 1 }, { unique: true });
export const Favorite = mongoose.model('Favorite', schema);
```

**Why this code exists:** Favorites are relationships rather than arrays duplicated inside the user and listing.

**Try it:** Issue simultaneous favorite requests and verify only one pair exists.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Idempotent PUT/DELETE and public-safe GET

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Favorite, Listing } from '../models/index.js';

export async function saveFavorite(userId, listingId) {
  // Do not allow favoriting a draft, sold or archived ad.
  const visible = await Listing.exists({ _id: listingId,
    status: 'published', deleted: false });
  if (!visible) { const e = new Error('Not found'); e.status = 404; throw e; }
  await Favorite.updateOne({ user: userId, listing: listingId },
    { $setOnInsert: { user: userId, listing: listingId } }, { upsert: true });
  return { saved: true }; // repeated PUT expresses the same desired state
}
export async function removeFavorite(userId, listingId) {
  await Favorite.deleteOne({ user: userId, listing: listingId });
  return { removed: true }; // repeated DELETE remains successful
}
export async function visibleFavorites(userId, { page = 1, limit = 20 }) {
  const rows = await Favorite.find({ user: userId })
    .sort({ _id: -1 }).skip((page - 1) * limit).limit(limit)
    .populate({ path: 'listing', match: { status: 'published', deleted: false } });
  // Populate can yield null for hidden listings: remove those entries.
  return rows.filter((row) => row.listing !== null);
}
```

**Why this code exists:** A unique compound index, upsert and idempotent method semantics protect repeated requests.

**Try it:** Favorite twice, sell the ad, list favorites again, remove twice.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

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
