# Week 07 · Class 02 — Moderation and Reports

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Review queued ads and public user reports with constrained staff permissions.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Two simultaneous moderator decisions must not both succeed.

## 3. Concepts covered

- Moderator/admin
- pending queue
- report deduplication
- resolve flag
- stale updates

## 4. Real-world example

Two simultaneous moderator decisions must not both succeed.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Pending queue→conditional approve/reject; user report public ad→unresolved queue→resolve.

## 7. Database flow

Listing status and Report unique reporter/listing.

## 8. Files involved

- `src/services/marketplace.js`
- `src/routes`
- `src/models/index.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Test ordinary user denial, double decision, duplicate report, staff resolve and admin-only cleanup.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

### Conditional approve/reject and report resolution

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing, Report } from '../models/index.js';

export async function decideAd(id, decision) {
  if (!['approve','reject'].includes(decision)) {
    const e = new Error('Invalid decision'); e.status = 422; throw e;
  }
  const nextStatus = decision === 'approve' ? 'published' : 'draft';
  const ad = await Listing.findOneAndUpdate(
    { _id: id, status: 'pending', deleted: false }, // compare-and-swap
    { $set: { status: nextStatus } }, { new: true },
  );
  if (!ad) { const e = new Error('Stale moderation decision'); e.status = 409; throw e; }
  return ad;
}

export async function resolveReport(reportId) {
  const report = await Report.findOneAndUpdate(
    { _id: reportId, resolved: false },
    { $set: { resolved: true } }, { new: true },
  );
  if (!report) { const e = new Error('Already resolved or missing'); e.status = 409; throw e; }
  return report;
}
```

**Why this code exists:** Only pending listings may receive a decision; decisions should not be overwritten by stale parallel staff requests.

**Try it:** Race approve and reject requests; assert exactly one decision changes the pending ad.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Report only a public listing

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing, Report } from '../models/index.js';

export async function reportAd({ reporterId, listingId, reason }) {
  const visible = await Listing.exists({ _id: listingId,
    status: 'published', deleted: false });
  if (!visible) { const e = new Error('Not found'); e.status = 404; throw e; }
  // Report index enforces at most one reporter/listing pair, including races.
  return Report.create({ reporter: reporterId, listing: listingId,
    reason, resolved: false });
}
```

**Why this code exists:** Reports operate on public content; errors on duplicates are handled centrally as conflicts.

**Try it:** Try reporting a draft, then a published ad, then the published ad again.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Protect moderator/admin route with current role

**File illustrated:** `src/routes/moderation.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Router } from 'express';
import { roles } from '../middleware/auth.js';
import { respond } from '../controllers/http.js';

export function moderationRoutes({ requireAuth, services }) {
  const router = Router();
  // requireAuth reloads current User role each request.
  router.get('/ads', requireAuth, roles('moderator','admin'),
    respond(() => services.listPendingAds()));
  router.post('/ads/:id', requireAuth, roles('moderator','admin'),
    respond((req) => services.decideAd(req.params.id, req.body.decision)));
  router.post('/cleanup', requireAuth, roles('admin'),
    respond(() => services.retryCleanup()));
  return router;
}
// Mounted at /api/moderation; route validators should also validate id/body.
```

**Why this code exists:** Middleware separates broad staff capabilities; the underlying service still enforces state invariants.

**Try it:** Try cleanup with moderator and verify 403; try deciding published listing and verify 409.

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

Moderators performing admin writes, arbitrary status patch, deleted report record. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Deliver moderation/report walkthrough with negative checks.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Reports and Moderation](../01-API-and-System-Topics/08-Reports-and-Moderation.md)

[Return to course index](../README.md)
