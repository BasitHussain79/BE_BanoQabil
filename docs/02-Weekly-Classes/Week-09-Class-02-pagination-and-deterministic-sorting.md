# Week 09 · Class 02 — Pagination and Deterministic Sorting

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Constrain page size and stabilize equal-value ordering.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Three equal-priced listings maintain deterministic secondary order.

## 3. Concepts covered

- page/limit/skip
- whitelisted sort
- _id tie-breaker
- offset tradeoffs

## 4. Real-world example

Three equal-priced listings maintain deterministic secondary order.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Validate page 1–1000/limit 1–50→approved sort→skip/limit.

## 7. Database flow

Queries use indexes; no total count query in current app.

## 8. Files involved

- `src/utils/query.js`
- `src/validators`
- `src/services/marketplace.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Create 25 records, verify defaults, page 2, price order ties, invalid bounds.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

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

### Explain the request end to end

1. **Input:** Which HTTP fields come from the client? Which values must be derived from the current User or database?
2. **Policy:** Point to the authentication, role, owner, participant, validation or state check.
3. **Database/provider effects:** Identify the conditional query, schema/index, and any SMTP/Cloudinary operation.
4. **Failure:** Predict HTTP status AND durable state when one operation fails.
5. **Evidence:** Capture a successful request, a denied request, and a database or fake-provider assertion.

## 10. Code explanation / tracing exercise

Write a five-column trace table: **route** | **validator/middleware** | **service rule** | **database/provider operation** | **public response**. Fill it from the actual source, not from assumed Express scaffolding. If a source snippet is absent, leave its exact identifier as `verify in source`.

## 11. Best practices

- Keep user-controlled input distinct from server-derived identity, role, owner, participant, and status.
- Use bounded validation and purpose-built queries rather than forwarding raw request objects to the database.
- Test persistent state, not just the HTTP status.
- Explain omitted features accurately: no React dashboard, payments, WebSockets, or deployed infrastructure in this project.

## 12. Common mistakes

Return all records, invent totals, arbitrary sort key. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Submit page sequence, tie order, and scaling discussion.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Pagination and Sorting](../01-API-and-System-Topics/10-Pagination-and-Sorting.md)

[Return to course index](../README.md)
