# Conversations and Messages

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

Stored private buyer–seller inquiry threads and participant-authorized message history. There are no real-time sockets or checkout.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/conversations` | Authenticated | List current user participating threads |
| `POST` | `/api/conversations` | Authenticated | Open/reuse a thread for published ad |
| `GET` | `/api/conversations/:id/messages` | Participant | Page newest-first message history |
| `POST` | `/api/conversations/:id/messages` | Participant | Store text message, 1–2000 characters |

## How the implementation works

1. Logged-in user chooses an approved published ad they do not own.
2. Service reads listing; derives buyer from current user and seller from stored Listing.owner.
3. Upsert a single Conversation for `(buyer,listing)` under a unique index.
4. GET conversation list only includes stored buyer or seller participation.
5. For every messages read/write, check participant in the database; unrelated callers get private 404.
6. Create Message with validated text and current sender; paginate newest-first.

## Invariants and exact boundaries

- Buyer and seller are personas, NOT distinct database roles.
- A seller cannot open a buyer inquiry about their own ad.
- Unique `(buyer,listing)` means repeat open returns same logical thread.
- Text length is 1–2000; message delivery is via HTTP persistence, not WebSockets.
- Do not expose whether an arbitrary private conversation ID exists to a nonparticipant.

## Database responsibilities

- Conversation: buyer, seller, listing; unique `(buyer,listing)`.
- Message: conversation, sender, text, timestamp; indexed for newest-by-conversation.

## Request or design example

```http
GET /api/conversations
Authorization: Bearer <access-token>
```

```http
POST /api/conversations
Authorization: Bearer <access-token>
Content-Type: application/json

<use listing field name from the source validator/Postman collection>
```

The README does not provide the exact body key for the listing reference, so the placeholder above is explanatory, not a literal JSON payload.

```http
POST /api/conversations/<conversation-id>/messages
Authorization: Bearer <access-token>
Content-Type: application/json

{"text":"Is this item still available?"}
```

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

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

### Prevent horizontal privilege escalation with scoped reads

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing, Conversation } from '../models/index.js';

export async function ownedAd(id, userId) {
  // Other users' private listings look the same as nonexistent listings.
  const ad = await Listing.findOne({ _id: id, owner: userId, deleted: false });
  if (!ad) { const e = new Error('Not found'); e.status = 404; throw e; }
  return ad;
}
export async function participantThread(id, userId) {
  const thread = await Conversation.findOne({ _id: id,
    $or: [{ buyer: userId }, { seller: userId }] });
  if (!thread) { const e = new Error('Not found'); e.status = 404; throw e; }
  return thread;
}
```

**Why this code exists:** Authentication proves which user is calling; ownership/participation proves access to a particular record.

**Try it:** Use three users; attempt cross-user edit and thread read, and compare response shape with missing IDs.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

## Verification checklist

- [ ] Open same thread twice and verify uniqueness.
- [ ] Self-inquiry rejected; draft/sold listing cannot start public inquiry.
- [ ] Buyer and seller can post/read; unrelated third account gets 404.
- [ ] Spoofed seller/sender fields do not redefine parties.
- [ ] Message 0 or 2001 characters rejected; paginated order newest-first.

## Common mistakes

- Trusting request body seller or sender.
- Authorizing only conversation creation, not each message request.
- Describing persisted messages as realtime chat.
- Leaking private thread existence through 403/400 distinctions.

## Practical assignment

Using seller, buyer and intruder accounts, open a single thread, send messages both directions, read pages, and prove that guessing the conversation ID yields a private 404 for the intruder.

## Source files to inspect

- `src/models/index.js`
- `src/services/marketplace.js`
- `src/routes/`
- `src/validators/`
- `tests/core.test.js`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
