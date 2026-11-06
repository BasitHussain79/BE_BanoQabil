# Images and Cloudinary

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

Secure multipart uploads, provider metadata, optimistic persistence, compensation, and admin retry for failed cleanup.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/ads/:id/images` | Owner | Upload up to five bounded images |
| `DELETE` | `/api/ads/:id/images` | Owner | Remove an image by publicId in JSON |
| `POST` | `/api/moderation/cleanup` | Admin | Retry up to 100 failed provider destroys |

## How the implementation works

1. Authenticate owner and validate listing ID/state before modifying gallery.
2. Multer accepts field `images` with at most five files, each 5 MiB maximum, held in memory.
3. Verify actual JPEG/PNG/WebP file signature and MIME agreement; check gallery total max eight.
4. Stream file to Cloudinary adapter and collect `publicId` + secure URL.
5. Append metadata and save Listing with optimistic concurrency.
6. If provider upload/save fails, destroy successfully uploaded assets (compensation).
7. If a destroy fails, persist a Cleanup job keyed by provider publicId.
8. When removing, persist listing metadata change and then destroy provider asset; failed destroys become recoverable Cleanup jobs.
9. Admin can retry up to 100 cleanup jobs; crash-created orphans still need independent reconciliation.

## Invariants and exact boundaries

- At most 5 upload files per request, 5 MiB each, 8 total per listing.
- Allowed detected file bytes: JPEG, PNG, WebP with MIME agreement.
- MongoDB and Cloudinary do not share an atomic transaction.
- Concurrent metadata saves use optimistic versioning; stale save maps to 409.
- Changing published listing imagery sends it to moderation again.

## Database responsibilities

- Listing.images embeds provider publicId and secure URL.
- Cleanup: unique publicId, attempts, lastError (operator recovery state).

## Request or design example

```http
POST /api/ads/<ad-object-id>/images
Authorization: Bearer <access-token>
Content-Type: multipart/form-data

images: <actual JPEG/PNG/WebP file>
```

```http
DELETE /api/ads/<ad-object-id>/images
Authorization: Bearer <access-token>
Content-Type: application/json

{"publicId":"<cloudinary-public-id>"}
```

In Postman choose **Body → form-data → key `images` → File**. Do not manually type a multipart boundary.

## Verification checklist

- [ ] Valid real JPEG/PNG/WebP accepted and saved.
- [ ] Renamed text/invalid MIME, six files, oversized file, ninth gallery image rejected.
- [ ] Stage second-upload failure; confirm first asset destroy attempted.
- [ ] Stage failed compensation destroy; assert Cleanup record, retry, and removal.
- [ ] Two concurrent gallery saves: one stale version conflicts.
- [ ] Unauthorized owner/invalid state cannot mutate image metadata.

## Common mistakes

- Trusting filename extension or request Content-Type alone.
- Storing base64 images inside MongoDB.
- Assuming rollback can atomically undo a Cloudinary upload.
- Removing provider file before updating MongoDB references without recovery plan.

## Practical assignment

Create an upload boundary matrix, then use fake Cloudinary adapters to demonstrate compensation, persistence of a failed destroy, admin recovery, and one stale version conflict.

## Source files to inspect

- `src/services/images.js`
- `src/config/` Cloudinary adapter
- `src/models/index.js`
- `src/middleware/errors.js`
- `tests/core.test.js`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
