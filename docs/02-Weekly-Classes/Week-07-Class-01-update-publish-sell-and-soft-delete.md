# Week 07 · Class 01 — Update, Publish, Sell, and Soft Delete

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Enforce explicit listing state transitions instead of arbitrary status writes.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Editing price on a published listing sends it back to pending.

## 3. Concepts covered

- PATCH partial fields
- re-review
- action endpoints
- conflicts
- category transfer

## 4. Real-world example

Editing price on a published listing sends it back to pending.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Owner edit→save; publish requires image; sold requires published; soft delete archived/deleted.

## 7. Database flow

Category transfer reserves new reference/releases old; state changed conditionally.

## 8. Files involved

- `src/services/marketplace.js`
- `src/routes`
- `src/models/index.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Walk draft→pending→published→pending→published→sold; test invalid state edges and delete.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

### Atomic publish, sold and archive commands

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing, Category } from '../models/index.js';

export async function publishAd(id, ownerId) {
  // The image prerequisite and draft state must hold in the UPDATE query.
  const ad = await Listing.findOneAndUpdate(
    { _id: id, owner: ownerId, deleted: false, status: 'draft', 'images.0': { $exists: true } },
    { $set: { status: 'pending' } }, { new: true },
  );
  if (!ad) { const e = new Error('Cannot publish'); e.status = 409; throw e; }
  return ad;
}

export async function markSold(id, ownerId) {
  const ad = await Listing.findOneAndUpdate(
    { _id: id, owner: ownerId, deleted: false, status: 'published' },
    { $set: { status: 'sold' } }, { new: true },
  );
  if (!ad) { const e = new Error('Invalid transition'); e.status = 409; throw e; }
  return ad;
}

// Archive must ALSO release the category reference exactly once. The two
// cross-document writes require deliberate ordering/compensation as covered
// by the Category guide; do not treat this example as a drop-in transaction.
```

**Why this code exists:** Action endpoints express state transitions instead of letting clients PATCH arbitrary status.

**Try it:** Attempt publish without media; publish with media; attempt two simultaneous sold actions.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Re-moderate edited published advertisements

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing } from '../models/index.js';

export async function editAd(id, ownerId, patch) {
  // Caller has already validated/picked supported content fields.
  const ad = await Listing.findOne({ _id: id, owner: ownerId, deleted: false });
  if (!ad) { const e = new Error('Not found'); e.status = 404; throw e; }
  if (!['draft','pending','published'].includes(ad.status)) {
    const e = new Error('Not editable'); e.status = 409; throw e;
  }
  Object.assign(ad, patch); // safe ONLY because patch was allowlisted
  if (ad.status === 'published') ad.status = 'pending'; // re-review required
  await ad.save(); // optimisticConcurrency guards stale document versions
  return ad;
}
```

**Why this code exists:** Published edits must be re-reviewed. The status change is coupled to the edit save.

**Try it:** Edit the price of a published listing and confirm it disappears from public search until approval.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Soft delete and release category references

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing, Category } from '../models/index.js';

export async function archiveAd(id, ownerId) {
  // One winner: repeat or concurrent deletes cannot release twice.
  const archived = await Listing.findOneAndUpdate(
    { _id: id, owner: ownerId, deleted: false,
      status: { $in: ['draft','pending','published','sold'] } },
    { $set: { deleted: true, status: 'archived' } }, { new: true },
  );
  if (!archived) { const e = new Error('Cannot archive'); e.status = 409; throw e; }
  // Cross-document update cannot commit atomically without a transaction.
  // Document compensating/reconciliation behavior for a crash in this gap.
  await Category.updateOne({ _id: archived.category, references: { $gt: 0 } },
    { $inc: { references: -1 } });
  return { archived: true };
}
```

**Why this code exists:** A soft delete preserves document history and releases its category reservation once.

**Try it:** Run concurrent archives; verify only one succeeds, then check reference count.

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

Editing sold, publish without image, hard-deleting. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Produce a state edge/HTTP/database effect matrix.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Ads and Listing Lifecycle](../01-API-and-System-Topics/04-Ads-and-Listing-Lifecycle.md)

[Return to course index](../README.md)
