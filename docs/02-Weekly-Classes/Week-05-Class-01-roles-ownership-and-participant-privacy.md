# Week 05 · Class 01 — Roles, Ownership, and Participant Privacy

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Combine coarse RBAC with ownership and participant-specific lookups.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Guessed conversation ID is hidden from unrelated logged-in user.

## 3. Concepts covered

- 401/403/404
- least privilege
- roles middleware
- private 404

## 4. Real-world example

Guessed conversation ID is hidden from unrelated logged-in user.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Verify identity→check role→scope owner/participant query→operation or 404.

## 7. Database flow

Listing.owner; Conversation buyer/seller; current User.role.

## 8. Files involved

- `src/middleware/auth.js`
- `src/services/marketplace.js`
- `src/routes`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Use user A, user B, moderator, admin to probe own/other ads and conversations.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

### Verify bearer token and reload current User

**File illustrated:** `src/middleware/auth.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/index.js';

export function requireAuth(jwtSecret) {
  return async (req, res, next) => {
    try {
      const match = /^Bearer (\S+)$/.exec(req.get('Authorization') ?? '');
      if (!match) return res.status(401).json({ error: 'Unauthorized' });
      // Pin allowed algorithm AND claims; never use jwt.decode for auth.
      const payload = jwt.verify(match[1], jwtSecret, {
        algorithms: ['HS256'], issuer: 'basit-marketplace',
        audience: 'marketplace-client',
      });
      if (!mongoose.isValidObjectId(payload.sub)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      // Every request uses current role, active and verified values from DB.
      const user = await User.findById(payload.sub);
      if (!user?.active || !user?.verified) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

export const roles = (...allowed) => (req, res, next) =>
  allowed.includes(req.user?.role)
    ? next()
    : res.status(403).json({ error: 'Forbidden' });
```

**Why this code exists:** The middleware rejects invalid identity with 401 and valid identity lacking permission with 403.

**Try it:** Try an expired token, an inactive user and a demoted admin.

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

Using UI-only authorization or returning another owner’s resource metadata. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Deliver complete role-resource access matrix with observed statuses.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Security, RBAC, Ownership and Privacy](../01-API-and-System-Topics/11-Security-RBAC-and-Ownership.md)
- [Conversations and Messages](../01-API-and-System-Topics/07-Conversations-and-Messages.md)

[Return to course index](../README.md)
