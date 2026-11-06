# Week 08 · Class 02 — Media Compensation and Recovery

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Keep MongoDB and Cloudinary consistent despite partial failures.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Upload 1 succeeds, upload 2 fails, destroy 1 fails: create Cleanup job.

## 3. Concepts covered

- Compensating actions
- Cleanup retries
- VersionError
- orphan reconciliation

## 4. Real-world example

Upload 1 succeeds, upload 2 fails, destroy 1 fails: create Cleanup job.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Upload→save; on failure destroy completed; persist failed destroys; admin retries.

## 7. Database flow

Cleanup keyed by publicId; optimistic Listing version checks.

## 8. Files involved

- `src/services/images.js`
- `src/models/index.js`
- `tests/core.test.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Inject upload/destroy failure, inspect Cleanup, retry, race stale Listing saves.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

### Rollback partial image uploads and persist failed destroys

**File illustrated:** `src/services/images.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing, Cleanup } from '../models/index.js';

export function makeImageService({ imageProvider }) {
  async function destroyOrQueue(publicId) {
    try { await imageProvider.destroy(publicId); }
    catch (error) {
      // Durable retry record when the external destroy fails.
      await Cleanup.updateOne({ publicId }, {
        $setOnInsert: { publicId },
        $inc: { attempts: 1 }, $set: { lastError: String(error.message).slice(0, 500) },
      }, { upsert: true });
    }
  }
  return async function addImages({ ownerId, adId, files }) {
    const ad = await Listing.findOne({ _id: adId, owner: ownerId, deleted: false });
    if (!ad) { const e = new Error('Not found'); e.status = 404; throw e; }
    if (!['draft','pending','published'].includes(ad.status) || ad.images.length + files.length > 8) {
      const e = new Error('Invalid gallery'); e.status = 422; throw e;
    }
    const uploaded = [];
    try {
      // Sequential uploads bound provider concurrency at cost of latency.
      for (const file of files) uploaded.push(await imageProvider.upload(file.buffer));
      ad.images.push(...uploaded);
      if (ad.status === 'published') ad.status = 'pending';
      return await ad.save(); // VersionError -> HTTP 409 in error middleware
    } catch (error) {
      for (const img of uploaded) await destroyOrQueue(img.publicId);
      throw error; // Never leak provider error details to HTTP clients.
    }
  };
}
```

**Why this code exists:** MongoDB and Cloudinary do not share a transaction. Compensation handles ordinary failures, while crash orphans still need reconciliation.

**Try it:** Make the second upload fail and the first destroy fail. Assert a durable Cleanup record exists.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Save metadata before destroying external media

**File illustrated:** `src/services/images.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing, Cleanup } from '../models/index.js';

export async function removeImage({ adId, ownerId, publicId, imageProvider }) {
  const ad = await Listing.findOne({ _id: adId, owner: ownerId, deleted: false });
  if (!ad) { const e = new Error('Not found'); e.status = 404; throw e; }
  const index = ad.images.findIndex((img) => img.publicId === publicId);
  if (index < 0) { const e = new Error('Not found'); e.status = 404; throw e; }
  ad.images.splice(index, 1);
  if (ad.status === 'published') ad.status = 'pending';
  await ad.save(); // first commit metadata, version-guard concurrent writes
  try { await imageProvider.destroy(publicId); }
  catch (error) {
    // Record durable work rather than lying that provider deletion succeeded.
    await Cleanup.updateOne({ publicId },
      { $setOnInsert: { publicId }, $inc: { attempts: 1 },
        $set: { lastError: String(error.message).slice(0, 500) } },
      { upsert: true });
  }
  return { removed: true };
}
// Note: complete lifecycle checks (e.g., sold/archived restrictions) belong
// here too; add them before copying this excerpt into your real project.
```

**Why this code exists:** Do not delete from Cloudinary before a Mongo save that might fail. The cleanup record allows retry.

**Try it:** Force destroy to fail; confirm image metadata is removed and Cleanup persists.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Administrator cleanup retry

**File illustrated:** `src/services/images.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Cleanup } from '../models/index.js';

export async function retryCleanup({ imageProvider }) {
  // Admin-only endpoint: bounded batch size protects provider cost/latency.
  const jobs = await Cleanup.find().sort({ _id: 1 }).limit(100);
  for (const job of jobs) {
    try {
      await imageProvider.destroy(job.publicId);
      await Cleanup.deleteOne({ _id: job.id });
    } catch (error) {
      await Cleanup.updateOne({ _id: job.id }, {
        $inc: { attempts: 1 },
          $set: { lastError: String(error.message).slice(0, 500) } });
    }
  }
  return { examined: jobs.length };
}
```

**Why this code exists:** Failures are expected and tracked; the endpoint is not a background worker.

**Try it:** Seed two jobs with one fake success and one fake failure; assert the correct records remain.

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

Believing a database transaction covers provider, ignoring crash orphan. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Prove failure compensation and stored recovery state.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Images and Cloudinary](../01-API-and-System-Topics/05-Images-and-Cloudinary.md)
- [Testing and Postman](../01-API-and-System-Topics/15-Testing-and-Postman.md)

[Return to course index](../README.md)
