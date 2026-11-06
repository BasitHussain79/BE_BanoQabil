# Week 09 · Class 01 — Search and Filtering

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Offer flexible discovery without permitting callers to widen public visibility.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Searching `.*` should match literal text, not all titles.

## 3. Concepts covered

- escaped regex
- exact filters
- numeric range
- validated ObjectId

## 4. Real-world example

Searching `.*` should match literal text, not all titles.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Validate query→force published/nondeleted→optional filters→sort/page.

## 7. Database flow

Listing index and predicate support published public discovery.

## 8. Files involved

- `src/utils/query.js`
- `src/validators`
- `src/services/marketplace.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Seed varied states/cities/categories/prices, query each and combined, test regex specials.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

### Safe public ad filter builder

**File illustrated:** `src/utils/query.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
export const escapeRegex = (value) =>
  // Escape regex special characters so q='.*' means literal punctuation.
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function buildPublicAdFilter(q) {
  // The client can NEVER override this mandatory visibility condition.
  const filter = { status: 'published', deleted: false };
  if (q.q) filter.title = { $regex: escapeRegex(q.q), $options: 'i' };
  if (q.city) filter.city = q.city;
  if (q.condition) filter.condition = q.condition;
  if (q.category) filter.category = q.category;
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    filter.price = {};
    if (q.minPrice !== undefined) filter.price.$gte = Number(q.minPrice);
    if (q.maxPrice !== undefined) filter.price.$lte = Number(q.maxPrice);
  }
  return filter;
}
```

**Why this code exists:** Allowlist query fields and add mandatory published/deleted predicates independently of input.

**Try it:** Search with q=.* and verify private listings do not appear.

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

Raw regex, req.query spread, calling title regex full-text search. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Produce filter test dataset and expected records.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Search and Filtering](../01-API-and-System-Topics/09-Search-and-Filtering.md)

[Return to course index](../README.md)
