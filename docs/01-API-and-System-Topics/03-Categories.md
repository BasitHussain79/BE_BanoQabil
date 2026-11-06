# Categories

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

Admin-managed one-level category taxonomy with active public reads, unique slugs, reference reservations, and conditional deletion.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/categories` | Public | List up to 500 active categories |
| `POST` | `/api/categories` | Admin | Create root or one-level child |
| `PATCH` | `/api/categories/:id` | Admin | Update name/active state |
| `DELETE` | `/api/categories/:id` | Admin | Remove only without children or active listing references |

## How the implementation works

1. Create an active root category such as Vehicles.
2. Optionally create a direct child such as Cars; a grandchild is not supported.
3. Use unique slug and `(name,parent)` indexes to prevent duplicate taxonomy entries.
4. Reserve a parent child counter before inserting a child; compensate if the insert fails.
5. Before creating a Listing reserve its category reference; compensate on failure.
6. Delete category only with both children=0 and references=0, using a conditional database operation.
7. If a crash creates safe overcounts, reconcile counters with writes paused.

## Invariants and exact boundaries

- Only one parent level; no arbitrary nesting.
- GET lists active categories only and is capped at 500.
- Category deletion with children or referenced ads is 409 conflict.
- Precheck-then-delete by itself is unsafe under concurrent creation.
- Counters can safely overcount after crashes; do not silently rewrite them during live writes.

## Database responsibilities

- Category: name, slug, active, parent, children, references.
- Listing.category references Category; category reservation counters protect category deletion.

## Request or design example

```http
GET /api/categories
```

```http
DELETE /api/categories/<category-object-id>
Authorization: Bearer <admin-token>
```

The README establishes root/child creation semantics; inspect the actual category validator for exact POST/PATCH body field names.

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

### Categories with bounded hierarchy and reservation counters

**File illustrated:** `src/models/index.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const categorySchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  active: { type: Boolean, default: true },
  // Counters protect against deleting a category during new references.
  references: { type: Number, default: 0, min: 0 },
  children: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
categorySchema.index({ name: 1, parent: 1 }, { unique: true });
export const Category = model('Category', categorySchema);
```

**Why this code exists:** Two counters serialize delete attempts against category/child creation. They can overcount after process crashes.

**Try it:** Attempt deletion while references or children are nonzero; explain why it must fail with a conflict.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Reserve a one-level child category

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Category } from '../models/index.js';

export async function createChildCategory({ name, slug, parentId }) {
  // The parent itself must be a root category: depth <= 1.
  const parent = await Category.findOneAndUpdate(
    { _id: parentId, parent: null, active: true },
    { $inc: { children: 1 } }, { new: true },
  );
  if (!parent) { const e = new Error('Invalid parent'); e.status = 422; throw e; }
  try {
    return await Category.create({ name, slug, parent: parentId, active: true });
  } catch (error) {
    // Compensate if uniqueness or validation rejects new child.
    await Category.updateOne({ _id: parentId }, { $inc: { children: -1 } });
    throw error;
  }
}
```

**Why this code exists:** Checking parent: null in the reservation query rejects grandchildren.

**Try it:** Create Vehicles→Cars and attempt Vehicles→Cars→Sedans; latter must fail.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Reserve category references before creating listings

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Category, Listing } from '../models/index.js';

export async function createDraft({ ownerId, categoryId, content }) {
  // Atomic increment competes safely with zero-counter category deletion.
  const category = await Category.findOneAndUpdate(
    { _id: categoryId, active: true },
    { $inc: { references: 1 } }, { new: true },
  );
  if (!category) { const e = new Error('Invalid category'); e.status = 422; throw e; }
  try {
    // Owner and status come from server context, never from request JSON.
    return await Listing.create({ ...content, owner: ownerId,
      category: categoryId, status: 'draft', deleted: false, images: [] });
  } catch (error) {
    // Ordinary failure compensation. A crash can leave a safe overcount.
    await Category.updateOne({ _id: categoryId }, { $inc: { references: -1 } });
    throw error;
  }
}
```

**Why this code exists:** Reserve first; create second; compensate failures rather than using an unsafe check-then-write.

**Try it:** Simulate failing Listing.create, then assert the counter is restored.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Conditionally delete empty categories

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Category } from '../models/index.js';

export async function deleteCategory(id) {
  // Deletion fails if a Listing reference or child reservation exists.
  const deleted = await Category.findOneAndDelete({
    _id: id, references: 0, children: 0,
  });
  if (!deleted) { const e = new Error('Category is in use'); e.status = 409; throw e; }
  // The real implementation must also release the parent's child counter
  // when deleting a child, with compensation on failure.
  return { deleted: true };
}
```

**Why this code exists:** The zero-counter condition is applied to the DELETE itself; a pre-read would race.

**Try it:** Race a category reservation with deletion. Describe the expected serial order.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

## Verification checklist

- [ ] Create root and first-level child; reject third level.
- [ ] Reject duplicate slug/name-parent combination.
- [ ] Reject inactive/invalid category for listing creation.
- [ ] In-use category delete returns 409; archive listing/release references, then delete.
- [ ] Concurrent category reference creation vs deletion preserves invariants.

## Common mistakes

- Check child count and then delete in separate unguarded operations.
- Allow unlimited tree depth.
- Reset counters while writes continue.
- Assume category deactivation automatically edits existing listings.

## Practical assignment

Design Vehicles → Cars; demonstrate public active visibility, duplicate rejection, third-level rejection, safe deletion conflicts, and recovery after archiving the last referenced listing.

## Source files to inspect

- `src/models/index.js`
- `src/services/marketplace.js`
- `src/routes/`
- `src/validators/`
- `tests/core.test.js`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
