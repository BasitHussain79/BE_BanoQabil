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

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

### Deduplicate reporter/listing reports

**File illustrated:** `src/models/index.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  reason: { type: String, minlength: 5, maxlength: 1000, required: true },
  resolved: { type: Boolean, default: false },
}, { timestamps: true });
schema.index({ reporter: 1, listing: 1 }, { unique: true });
export const Report = mongoose.model('Report', schema);
```

**Why this code exists:** A repeated report by the same user for the same listing is a conflict, not a new ticket.

**Try it:** Report the same published ad twice and inspect one database record.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Report only a public listing

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing, Report } from '../models/index.js';

export async function reportAd({ reporterId, listingId, reason }) {
  const visible = await Listing.exists({ _id: listingId,
    status: 'published', deleted: false });
  if (!visible) { const e = new Error('Not found'); e.status = 404; throw e; }
  // Report index enforces at most one reporter/listing pair, including races.
  return Report.create({ reporter: reporterId, listing: listingId,
    reason, resolved: false });
}
```

**Why this code exists:** Reports operate on public content; errors on duplicates are handled centrally as conflicts.

**Try it:** Try reporting a draft, then a published ad, then the published ad again.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Conditional approve/reject and report resolution

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing, Report } from '../models/index.js';

export async function decideAd(id, decision) {
  if (!['approve','reject'].includes(decision)) {
    const e = new Error('Invalid decision'); e.status = 422; throw e;
  }
  const nextStatus = decision === 'approve' ? 'published' : 'draft';
  const ad = await Listing.findOneAndUpdate(
    { _id: id, status: 'pending', deleted: false }, // compare-and-swap
    { $set: { status: nextStatus } }, { new: true },
  );
  if (!ad) { const e = new Error('Stale moderation decision'); e.status = 409; throw e; }
  return ad;
}

export async function resolveReport(reportId) {
  const report = await Report.findOneAndUpdate(
    { _id: reportId, resolved: false },
    { $set: { resolved: true } }, { new: true },
  );
  if (!report) { const e = new Error('Already resolved or missing'); e.status = 409; throw e; }
  return report;
}
```

**Why this code exists:** Only pending listings may receive a decision; decisions should not be overwritten by stale parallel staff requests.

**Try it:** Race approve and reject requests; assert exactly one decision changes the pending ad.

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
