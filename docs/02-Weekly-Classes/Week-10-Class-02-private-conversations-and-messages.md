# Week 10 · Class 02 — Private Conversations and Messages

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Implement persisted private inquiries with participant protection.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Buyer: “Still available?”; seller replies; intruder sees 404.

## 3. Concepts covered

- Unique thread
- derived seller
- anti-enumeration 404
- message bounds

## 4. Real-world example

Buyer: “Still available?”; seller replies; intruder sees 404.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Open thread for published non-own listing→participant-scoped send/read.

## 7. Database flow

Conversation unique buyer/listing; Message conversation/sender/time.

## 8. Files involved

- `src/models/index.js`
- `src/services/marketplace.js`
- `src/routes`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Open twice, self-attempt, send/read both ways, page messages, intruder 404.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

### Private thread and persisted message schema

**File illustrated:** `src/models/index.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const conversationSchema = new Schema({
  buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
}, { timestamps: true });
conversationSchema.index({ buyer: 1, listing: 1 }, { unique: true });
export const Conversation = model('Conversation', conversationSchema);

const messageSchema = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, minlength: 1, maxlength: 2000 },
}, { timestamps: true });
messageSchema.index({ conversation: 1, createdAt: -1, _id: -1 });
export const Message = model('Message', messageSchema);
```

**Why this code exists:** One buyer/listing pair maps to one conversation. Messages are stored, not delivered over WebSockets.

**Try it:** Create a thread twice, then inspect unique index and message timestamps.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Derive seller and enforce participant access

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing, Conversation, Message } from '../models/index.js';

export async function openInquiry(buyerId, listingId) {
  const ad = await Listing.findOne({ _id: listingId,
    status: 'published', deleted: false });
  if (!ad || String(ad.owner) === String(buyerId)) {
    const e = new Error('Not found'); e.status = 404; throw e;
  }
  // Client cannot choose the seller; owner is loaded from the Listing.
  return Conversation.findOneAndUpdate(
    { buyer: buyerId, listing: listingId },
    { $setOnInsert: { buyer: buyerId, seller: ad.owner, listing: listingId } },
    { new: true, upsert: true },
  );
}

export async function sendMessage(userId, conversationId, text) {
  // Authorization predicate is inside the document lookup.
  const thread = await Conversation.findOne({ _id: conversationId,
    $or: [{ buyer: userId }, { seller: userId }] });
  if (!thread) { const e = new Error('Not found'); e.status = 404; throw e; }
  if (text.length < 1 || text.length > 2000) {
    const e = new Error('Invalid text'); e.status = 422; throw e;
  }
  return Message.create({ conversation: thread.id, sender: userId, text });
}
```

**Why this code exists:** Both new and repeated conversation requests use the same unique thread; every message checks participants.

**Try it:** Buyer and seller send messages; a third account tries a guessed thread ID and receives a private 404.

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

Trusting body seller/sender, claiming WebSocket chat. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Submit two-party conversation demo and privacy proof.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Conversations and Messages](../01-API-and-System-Topics/07-Conversations-and-Messages.md)

[Return to course index](../README.md)
