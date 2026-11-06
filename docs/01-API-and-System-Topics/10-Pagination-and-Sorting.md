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
