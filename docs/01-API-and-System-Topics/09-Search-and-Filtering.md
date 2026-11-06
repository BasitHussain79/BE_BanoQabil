# Search and Filtering

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

Public ad discovery built from validated, server-enforced visibility plus safe literal title search and optional filters.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/ads` | Public | Filter public ads by query, category, city, condition, and price |
| `GET` | `/api/ads/:id` | Public | Only published nondeleted detail |

## How the implementation works

1. Validate and coerce query input before constructing a database filter.
2. Initialize mandatory criteria `{status:"published", deleted:false}` independent of caller input.
3. Escape regex metacharacters in `q`; search title as a literal-containing pattern, not as raw user regex.
4. Add only whitelisted city, condition, category ObjectId, minPrice/maxPrice constraints.
5. Apply approved sort, deterministic `_id` tie-breaker, and bounded skip/limit.
6. Project public listing data without leaking drafts or private state.

## Invariants and exact boundaries

- `q` max 100; `city` max 80; `condition` new/used.
- `category` must be a valid MongoDB ObjectId.
- `minPrice/maxPrice` 0–1,000,000,000.
- No client-supplied Mongo operators should override required state filters.
- This is escaped title regex, not full-text search or search engine relevance.

## Database responsibilities

- Listing status/deleted public predicate and indexes support main read path.
- Category ObjectId is an optional exact reference filter.

## Request or design example

```http
GET /api/ads?q=phone&city=Lahore&condition=used&minPrice=100&maxPrice=100000&sort=newest&page=1&limit=20
```

```http
GET /api/ads?q=.*
```

In the second request, `.*` must be treated as literal input, not a pattern matching all titles.

## Verification checklist

- [ ] Seed published, draft, pending, sold, and deleted listings; only approved records return.
- [ ] Search `.*` literally rather than matching everything by regex syntax.
- [ ] Combine city, condition, category, min/max price.
- [ ] Invalid category, invalid condition, or price bounds rejected.
- [ ] Ensure public detail with private ID returns 404.

## Common mistakes

- Passing `req.query` directly to MongoDB.
- Using unescaped regex or calling it full-text search.
- Applying optional filters before/without mandatory status predicate.
- Allowing client query to control Mongo operators/sort objects.

## Practical assignment

Create a 10-listing seed matrix across state, city, price and category. Record results for each filter, combined filters, invalid query, and literal-regex search.

## Source files to inspect

- `src/utils/query.js`
- `src/validators/`
- `src/services/marketplace.js`
- `src/models/index.js`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
