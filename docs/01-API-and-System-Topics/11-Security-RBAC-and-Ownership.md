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
