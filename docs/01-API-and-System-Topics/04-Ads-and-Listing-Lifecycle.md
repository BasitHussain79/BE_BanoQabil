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
