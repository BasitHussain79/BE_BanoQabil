# Week 06 · Class 01 — Category Hierarchy and Reference Safety

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Protect one-level taxonomy against conflicting deletes and creations.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Vehicles→Cars allowed; Cars→Sedans third-level not supported.

## 3. Concepts covered

- Slugs
- active state
- child/reference counters
- compensation

## 4. Real-world example

Vehicles→Cars allowed; Cars→Sedans third-level not supported.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Reserve parent child counter→insert child; Listing reserve ref→insert; zero-counter conditional delete.

## 7. Database flow

Category counters + unique slug/name-parent indexes.

## 8. Files involved

- `src/models/index.js`
- `src/services/marketplace.js`
- `src/routes`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Create root/child, reject third level/duplicate, test in-use delete, archive ad then delete.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

### Reserve a one-level child category

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Category } from '../models/index.js';

export async function createChildCategory({ name, slug, parentId }) {
  // The parent itself must be a root category: depth <= 1.
  const parent = await Category.findOneAndUpdate(
    { _id: parentId, parent: null, active: true },
    { $inc: { children: 1 } }, { new: true },
  );
  if (!parent) { const e = new Error('Invalid parent'); e.status = 422; throw e; }
  try {
    return await Category.create({ name, slug, parent: parentId, active: true });
  } catch (error) {
    // Compensate if uniqueness or validation rejects new child.
    await Category.updateOne({ _id: parentId }, { $inc: { children: -1 } });
    throw error;
  }
}
```

**Why this code exists:** Checking parent: null in the reservation query rejects grandchildren.

**Try it:** Create Vehicles→Cars and attempt Vehicles→Cars→Sedans; latter must fail.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Reserve category references before creating listings

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Category, Listing } from '../models/index.js';

export async function createDraft({ ownerId, categoryId, content }) {
  // Atomic increment competes safely with zero-counter category deletion.
  const category = await Category.findOneAndUpdate(
    { _id: categoryId, active: true },
    { $inc: { references: 1 } }, { new: true },
  );
  if (!category) { const e = new Error('Invalid category'); e.status = 422; throw e; }
  try {
    // Owner and status come from server context, never from request JSON.
    return await Listing.create({ ...content, owner: ownerId,
      category: categoryId, status: 'draft', deleted: false, images: [] });
  } catch (error) {
    // Ordinary failure compensation. A crash can leave a safe overcount.
    await Category.updateOne({ _id: categoryId }, { $inc: { references: -1 } });
    throw error;
  }
}
```

**Why this code exists:** Reserve first; create second; compensate failures rather than using an unsafe check-then-write.

**Try it:** Simulate failing Listing.create, then assert the counter is restored.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Conditionally delete empty categories

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Category } from '../models/index.js';

export async function deleteCategory(id) {
  // Deletion fails if a Listing reference or child reservation exists.
  const deleted = await Category.findOneAndDelete({
    _id: id, references: 0, children: 0,
  });
  if (!deleted) { const e = new Error('Category is in use'); e.status = 409; throw e; }
  // The real implementation must also release the parent's child counter
  // when deleting a child, with compensation on failure.
  return { deleted: true };
}
```

**Why this code exists:** The zero-counter condition is applied to the DELETE itself; a pre-read would race.

**Try it:** Race a category reservation with deletion. Describe the expected serial order.

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

Precheck-then-delete race, resetting counters live. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Show both safety conflict and compensating release behavior.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Categories](../01-API-and-System-Topics/03-Categories.md)
- [Database Models and Indexes](../01-API-and-System-Topics/14-Database-Models-and-Indexes.md)

[Return to course index](../README.md)
