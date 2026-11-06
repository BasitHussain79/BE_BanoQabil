# Week 02 · Class 02 — Mongoose Models and Relationships

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Explain eight schemas, ObjectId references, indexes and concurrency.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Two parallel PUT favorites should not produce duplicate join documents.

## 3. Concepts covered

- Refs
- compound indexes
- enums
- select:false
- optimistic __v

## 4. Real-world example

Two parallel PUT favorites should not produce duplicate join documents.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Validate ID→service builds scoped query→schema/index reinforces invariant.

## 7. Database flow

Diagram core User/Category/Listing plus Favorite, Conversation, Message, Report, Cleanup.

## 8. Files involved

- `src/models/index.js`
- `src/services/marketplace.js`
- `tests/core.test.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Draw ERD, enumerate unique indexes, inspect secret projections, demonstrate duplicate and stale version.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

### Listing lifecycle and optimistic version checks

**File illustrated:** `src/models/index.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const imageSchema = new Schema({ publicId: String, url: String }, { _id: false });
const listingSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  title: { type: String, required: true, minlength: 5, maxlength: 100 },
  description: { type: String, required: true, minlength: 20, maxlength: 3000 },
  city: { type: String, required: true },
  price: { type: Number, min: 1, max: 1_000_000_000, required: true },
  condition: { type: String, enum: ['new', 'used'], required: true },
  images: [imageSchema],
  status: { type: String, enum: ['draft','pending','published','sold','archived'], default: 'draft' },
  deleted: { type: Boolean, default: false },
}, { timestamps: true, optimisticConcurrency: true });
listingSchema.index({ status: 1, deleted: 1, createdAt: -1, _id: -1 });
export const Listing = model('Listing', listingSchema);
```

**Why this code exists:** Server controls listing state; a versioned document guards concurrent saves that modify image arrays.

**Try it:** Create a draft, make two copies, save conflicting changes and observe a version conflict.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

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

Treating unique as friendly validation or ignoring stale saves. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Submit an ERD and four index/race rationales.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Database Models and Indexes](../01-API-and-System-Topics/14-Database-Models-and-Indexes.md)

[Return to course index](../README.md)
