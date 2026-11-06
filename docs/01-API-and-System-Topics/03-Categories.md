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
