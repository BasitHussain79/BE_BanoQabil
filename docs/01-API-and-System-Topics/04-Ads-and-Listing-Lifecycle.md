# Ads and Listing Lifecycle

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

Create owner-scoped drafts, edit content, request publication, moderate, mark sold, and soft-delete with explicit state transitions.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/ads` | Public | Published nondeleted ads with discovery filters |
| `GET` | `/api/ads/mine` | Authenticated | Owned ads, including private drafts |
| `POST` | `/api/ads` | Authenticated | Create draft; owner derived server-side |
| `GET` | `/api/ads/:id` | Public | Published nondeleted detail only |
| `PATCH` | `/api/ads/:id` | Owner | Partially edit allowed fields |
| `POST` | `/api/ads/:id/publish` | Owner | Draft with image → pending |
| `POST` | `/api/ads/:id/sold` | Owner | Published → sold |
| `POST` | `/api/ads/:id/delete` | Owner | Archive/soft-delete allowed state |

## How the implementation works

1. Admin creates an active category; user creates draft with six validated fields.
2. Server derives owner, draft status, deleted=false, and empty images; ignores client attempts to assign owner/status.
3. Owner uploads at least one validated image.
4. Owner requests publish: draft → pending (image prerequisite).
5. Moderator/admin approves pending → published or rejects pending → draft.
6. Public search and public detail show ONLY `published` and `deleted:false`.
7. Editing a published ad returns it to pending; published → sold is available to the owner.
8. Soft deletion changes status to archived and deleted=true and releases category reference.

## Invariants and exact boundaries

- Ad states: `draft`, `pending`, `published`, `sold`, `archived`.
- Published content/image changes need re-moderation.
- Transitions are action-based, not arbitrary PATCH status updates.
- Owner mismatches use private 404; invalid/stale transitions generally 409.
- Public reads never expose draft/pending/sold/archived/deleted ads.

## Database responsibilities

- Listing: owner, category, title, description, price, city, condition, status, deleted, images, timestamps, optimistic version.
- Category references are reserved/released on lifecycle changes.

## Request or design example

```http
POST /api/ads
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "title":"Good phone",
  "description":"A working phone with charger",
  "price":100,
  "city":"Lahore",
  "category":"<category-object-id>",
  "condition":"used"
}
```

```http
POST /api/ads/<ad-object-id>/publish
Authorization: Bearer <access-token>
```

The JSON request is only for content. `owner`, `status`, `deleted`, and `images` are server-controlled.

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

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

### Pick allowed listing fields and enforce owner-only drafts

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing } from '../models/index.js';

const CONTENT_FIELDS = ['title','description','price','city','category','condition'];
export function pickAd(body) {
  // Ignore a forged status, owner, deleted or images field in request JSON.
  return Object.fromEntries(CONTENT_FIELDS
    .filter((field) => body[field] !== undefined)
    .map((field) => [field, body[field]]));
}

export async function myAds(ownerId, { page = 1, limit = 20 }) {
  return Listing.find({ owner: ownerId, deleted: false })
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit).limit(limit).lean();
}

export async function publicAd(id) {
  // Public API cannot be used to read a pending or archived draft.
  const ad = await Listing.findOne({ _id: id,
    status: 'published', deleted: false }).lean();
  if (!ad) { const e = new Error('Not found'); e.status = 404; throw e; }
  return ad;
}
```

**Why this code exists:** The request body cannot set authority or visibility. Public reads are always scoped to approved listings.

**Try it:** Create a draft with status=published in the request; compare saved state and public GET.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Atomic publish, sold and archive commands

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing, Category } from '../models/index.js';

export async function publishAd(id, ownerId) {
  // The image prerequisite and draft state must hold in the UPDATE query.
  const ad = await Listing.findOneAndUpdate(
    { _id: id, owner: ownerId, deleted: false, status: 'draft', 'images.0': { $exists: true } },
    { $set: { status: 'pending' } }, { new: true },
  );
  if (!ad) { const e = new Error('Cannot publish'); e.status = 409; throw e; }
  return ad;
}

export async function markSold(id, ownerId) {
  const ad = await Listing.findOneAndUpdate(
    { _id: id, owner: ownerId, deleted: false, status: 'published' },
    { $set: { status: 'sold' } }, { new: true },
  );
  if (!ad) { const e = new Error('Invalid transition'); e.status = 409; throw e; }
  return ad;
}

// Archive must ALSO release the category reference exactly once. The two
// cross-document writes require deliberate ordering/compensation as covered
// by the Category guide; do not treat this example as a drop-in transaction.
```

**Why this code exists:** Action endpoints express state transitions instead of letting clients PATCH arbitrary status.

**Try it:** Attempt publish without media; publish with media; attempt two simultaneous sold actions.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Re-moderate edited published advertisements

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing } from '../models/index.js';

export async function editAd(id, ownerId, patch) {
  // Caller has already validated/picked supported content fields.
  const ad = await Listing.findOne({ _id: id, owner: ownerId, deleted: false });
  if (!ad) { const e = new Error('Not found'); e.status = 404; throw e; }
  if (!['draft','pending','published'].includes(ad.status)) {
    const e = new Error('Not editable'); e.status = 409; throw e;
  }
  Object.assign(ad, patch); // safe ONLY because patch was allowlisted
  if (ad.status === 'published') ad.status = 'pending'; // re-review required
  await ad.save(); // optimisticConcurrency guards stale document versions
  return ad;
}
```

**Why this code exists:** Published edits must be re-reviewed. The status change is coupled to the edit save.

**Try it:** Edit the price of a published listing and confirm it disappears from public search until approval.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Soft delete and release category references

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing, Category } from '../models/index.js';

export async function archiveAd(id, ownerId) {
  // One winner: repeat or concurrent deletes cannot release twice.
  const archived = await Listing.findOneAndUpdate(
    { _id: id, owner: ownerId, deleted: false,
      status: { $in: ['draft','pending','published','sold'] } },
    { $set: { deleted: true, status: 'archived' } }, { new: true },
  );
  if (!archived) { const e = new Error('Cannot archive'); e.status = 409; throw e; }
  // Cross-document update cannot commit atomically without a transaction.
  // Document compensating/reconciliation behavior for a crash in this gap.
  await Category.updateOne({ _id: archived.category, references: { $gt: 0 } },
    { $inc: { references: -1 } });
  return { archived: true };
}
```

**Why this code exists:** A soft delete preserves document history and releases its category reservation once.

**Try it:** Run concurrent archives; verify only one succeeds, then check reference count.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

## Verification checklist

- [ ] Client-provided owner/status/deleted/images do not modify server-owned fields.
- [ ] Owner can read own draft while public client sees 404.
- [ ] Publish without image rejects; approved publish appears publicly.
- [ ] Published price/image edit moves back to pending.
- [ ] Sold and delete flows; invalid state transitions are rejected.
- [ ] Two owners cannot edit each other’s listing; stale edits conflict.

## Common mistakes

- Create public ad directly from client status.
- Allow edits of sold listings or publish without images.
- Forget to exclude deleted ads from search or public detail.
- Call soft deletion a physical erase.

## Practical assignment

Build a transition matrix including draft, pending, published, sold, archived, and invalid edges. Prove each transition with a request and the persisted final state using two users and a moderator.

## Source files to inspect

- `src/services/marketplace.js`
- `src/models/index.js`
- `src/validators/`
- `src/routes/`
- `tests/core.test.js`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
