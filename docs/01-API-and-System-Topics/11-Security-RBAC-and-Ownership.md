# Security, RBAC, Ownership and Privacy

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

Boundary-aware permissions combining token authentication, current database role, resource ownership, conversation participation, and public visibility.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `ALL` | `Protected routes` | Authenticated | Load current account state |
| `PATCH` | `/api/ads/:id` | Owner | Own listing only |
| `GET` | `/api/conversations/:id/messages` | Participant | Stored buyer or seller only |
| `GET` | `/api/moderation/ads` | Moderator/Admin | Staff-only queue |
| `PATCH` | `/api/users/:id` | Admin | Other-user management |

## How the implementation works

1. Authenticate Bearer token by verifying HS256 signature/issuer/audience/expiry/subject.
2. Reload active, verified User and current persisted role from MongoDB.
3. Apply coarse route role: user, moderator, or admin according to capability.
4. Scope per-resource queries (`owner=req.user._id`; participant is buyer or seller).
5. Enforce public visibility separately for anonymous reads.
6. Use 401 for unavailable identity, 403 for wrong coarse role, and private 404 for owner/participant mismatch.

## Invariants and exact boundaries

- `user` can both sell and inquire; personas are not roles.
- A moderator does not acquire category/user/cleanup administration.
- Never authorize a resource merely because the user has a valid JWT.
- Role claims in an old token are not authoritative; current DB role wins.
- Anti-enumeration 404 protects private owned/participant resources.
- Rate limits are currently per-process in-memory maps, not distributed security controls.

## Database responsibilities

- User.role, active, verified.
- Listing.owner; Conversation.buyer and seller; Listing.status/deleted.

## Request or design example

```http
PATCH /api/ads/<another-users-ad-id>
Authorization: Bearer <valid-but-not-owner-token>
```

Expected documented privacy behavior: **404**, not a disclosure that the ad belongs to another user.

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

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

## Verification checklist

- [ ] Anonymous 401, authenticated insufficient role 403, unrelated owner/participant 404.
- [ ] Old admin token after demotion cannot exercise admin capability.
- [ ] Active false/verified false blocks next protected request.
- [ ] Forged owner/role input does not override service-derived user.
- [ ] Public GET never leaks draft/pending/sold/archived.

## Common mistakes

- Conflating seller persona with a privileged role.
- Checking only login and omitting owner predicate.
- Trusting JWT role claim or UI visibility.
- Returning 403 for a guessed private conversation ID.

## Practical assignment

Write a role × resource matrix for anonymous, user A, user B, moderator, admin. Include a post-demotion check and justify 401/403/404 choices.

## Source files to inspect

- `src/middleware/auth.js`
- `src/services/marketplace.js`
- `src/routes/`
- `tests/core.test.js`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
