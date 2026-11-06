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
