# Pagination and Sorting

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

Reusable bounded offset pagination and deterministic, allowlisted sorting across listing and administrative collections.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/ads` | Public | Sorted and paginated published listings |
| `GET` | `/api/users` | Admin | Paginated users |
| `GET` | `/api/favorites` | Authenticated | Paginated favorites |
| `GET` | `/api/conversations/:id/messages` | Participant | Paginated newest-first messages |
| `GET` | `/api/moderation/ads` | Staff | Pending queue pagination |
| `GET` | `/api/moderation/reports` | Staff | Unresolved report pagination |

## How the implementation works

1. Validate `page` and `limit` as integer values, applying defaults 1 and 20.
2. Restrict page to 1–1000 and limit to 1–50.
3. Compute `skip=(page-1)*limit`; never allow arbitrary unbounded request sizes.
4. Accept only `newest`, `price-asc`, `price-desc` sort on listings.
5. Include `_id` tie-breaker when another sort key may tie.
6. Apply query, sort, skip, limit at Mongoose query boundary.
7. Return arrays in `data`; the current API does not calculate totals or page-count metadata.

## Invariants and exact boundaries

- Page 1–1000, default 1; limit 1–50, default 20.
- Listing sort: newest, price-asc, price-desc.
- If prices tie, `_id:-1` gives consistent tie order.
- Offset pagination can be costly/deviate as dataset changes; cursor pagination is a future enhancement.
- Do not invent `{total,totalPages}` in responses.

## Database responsibilities

- Listing includes indexed public-state/newest path.
- Message includes conversation/time index.
- Other paginated collections use their relevant indexes.

## Request or design example

```http
GET /api/ads?page=2&limit=10&sort=price-asc
```

```text
skip = (2 - 1) * 10 = 10
limit = 10
```

A list endpoint returns its successful payload under `data`; inspect the concrete route to verify whether it is nested or directly an array.

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

### Bounded offset pagination and stable sort

**File illustrated:** `src/utils/query.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
const SORT = {
  newest: { createdAt: -1, _id: -1 },
  'price-asc': { price: 1, _id: -1 },
  'price-desc': { price: -1, _id: -1 },
};
export function pagination(query) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  // Validate integer bounds BEFORE passing data to this helper in routes.
  if (!Number.isInteger(page) || page < 1 || page > 1000 ||
      !Number.isInteger(limit) || limit < 1 || limit > 50) {
    const e = new Error('Invalid pagination'); e.status = 422; throw e;
  }
  return { skip: (page - 1) * limit, limit,
    sort: SORT[query.sort ?? 'newest'] ?? SORT.newest };
}
```

**Why this code exists:** The _id tie-breaker stabilizes ordering for identical prices/timestamps. Results do not include total counts in the documented contract.

**Try it:** Insert equal-price ads and verify page boundaries and sort order.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Find public ads with bounded search and pagination

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing } from '../models/index.js';
import { buildPublicAdFilter, pagination } from '../utils/query.js';

export async function searchAds(input) {
  // Validate type, length, ObjectId and price bounds in route validators.
  const filter = buildPublicAdFilter(input);
  const { skip, limit, sort } = pagination(input);
  // Skip/limit is bounded. No total count is promised by this API.
  const ads = await Listing.find(filter).sort(sort).skip(skip).limit(limit).lean();
  return ads;
}
```

**Why this code exists:** Validation, mandatory visibility and stable sort compose into a predictable query.

**Try it:** Query for an unpublished draft with q and filters and show it never appears.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

## Verification checklist

- [ ] Omitted page/limit defaults; page 2 returns expected slice.
- [ ] Limits 0/51 and pages 0/1001 rejected.
- [ ] Equal prices have deterministic repeated order via tie-breaker.
- [ ] Sort cannot accept arbitrary database keys.
- [ ] Read response shape contains array without total-count promises.

## Common mistakes

- Returning all documents.
- Treating offset pagination as consistent snapshot under concurrent writes.
- Omitting secondary sort on equal values.
- Advertising total records/page count that is not computed.

## Practical assignment

Seed at least 25 listings (including equal prices), verify page boundaries, repeat sorted pages, inspect stable ordering, and discuss two limitations of deep offset paging.

## Source files to inspect

- `src/utils/query.js`
- `src/validators/`
- `src/services/marketplace.js`
- `src/models/index.js`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
