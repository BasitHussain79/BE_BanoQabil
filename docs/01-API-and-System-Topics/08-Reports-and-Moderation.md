# Reports and Moderation

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

User reporting of public ads and least-privilege staff workflows for publication decisions, report resolution, and cleanup recovery.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/reports` | Authenticated | One report per reporter/public listing |
| `GET` | `/api/moderation/reports` | Moderator/Admin | List unresolved report queue |
| `POST` | `/api/moderation/reports/:id/resolve` | Moderator/Admin | Mark report resolved |
| `GET` | `/api/moderation/ads` | Moderator/Admin | List pending listings |
| `POST` | `/api/moderation/ads/:id` | Moderator/Admin | Approve/reject pending listing |
| `POST` | `/api/moderation/cleanup` | Admin only | Retry failed Cloudinary cleanup |

## How the implementation works

1. Owner requests publication; listing enters pending queue.
2. Staff `moderator` or `admin` loads pending ads; ordinary user is denied.
3. Staff approve/reject uses a conditional update matching pending state so two stale decisions cannot both succeed.
4. Published listing becomes eligible for public reports.
5. Reporter can report a public listing once; unique `(reporter,listing)` protects retries/concurrency.
6. Staff lists unresolved reports and marks a report resolved, preserving historical report record.
7. Cleanup is separate and admin-only, not a moderator capability.

## Invariants and exact boundaries

- Moderator has user capabilities plus moderation, not user/category/cleanup administration.
- Moderation should not expose arbitrary status mutation.
- Pending → published on approval; pending → draft on rejection.
- Duplicate report is a conflict/deduplicated condition; see actual service response to determine exact status.
- Report reason length is 5–1000 characters.
- Production audit logs and richer abuse workflows are not implemented.

## Database responsibilities

- Listing.status moderation transitions.
- Report: reporter, listing, reason, resolved; unique `(reporter,listing)`.
- Cleanup: provider recovery admin operation.

## Request or design example

```http
GET /api/moderation/ads
Authorization: Bearer <moderator-or-admin-token>
```

```http
GET /api/moderation/reports?page=1&limit=20
Authorization: Bearer <moderator-or-admin-token>
```

The README does not enumerate the exact report creation/decision JSON body. Copy the field names from validators or the supplied Postman collection, rather than inventing them.

## Verification checklist

- [ ] User denied moderator and admin endpoints.
- [ ] Approve and reject pending; invalid decisions/stale double-decision conflict.
- [ ] Create report for public ad; draft/deleted ad report rejected.
- [ ] Duplicate report per user/listing blocked; different users may report same ad.
- [ ] List unresolved and resolve once; verify stored resolved flag.
- [ ] Moderator denied cleanup while admin can run it.

## Common mistakes

- Assuming `moderator` can modify users or categories.
- Letting request body set Listing.status without transition guards.
- Deleting report instead of recording resolution.
- Creating a report for hidden listing and leaking its existence.

## Practical assignment

Run a complete queue: publish → approve → report → resolve; then show role denial, duplicate report, stale double-decision, and admin-only cleanup restriction.

## Source files to inspect

- `src/services/marketplace.js`
- `src/models/index.js`
- `src/middleware/auth.js`
- `src/routes/`
- `tests/core.test.js`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
