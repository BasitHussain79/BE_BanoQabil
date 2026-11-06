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

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

### Multer memory limit and MIME/signature checks

**File illustrated:** `src/routes/ads.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';

// Multer limits how much is accepted into process memory.
export const upload = multer({ storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 5 * 1024 * 1024 },
}).array('images', 5);

const SUPPORTED = new Map([
  ['image/jpeg','jpg'], ['image/png','png'], ['image/webp','webp'],
]);
export async function verifyImages(files = []) {
  for (const file of files) {
    const detected = await fileTypeFromBuffer(file.buffer);
    // Header/extensions are client-controlled: verify actual signature.
    if (!detected || !SUPPORTED.has(detected.mime) ||
        file.mimetype !== detected.mime) {
      const error = new Error('Unsupported image'); error.status = 422; throw error;
    }
  }
}
```

**Why this code exists:** Multer limits size/count; signature checking rejects disguised non-image content.

**Try it:** Try sending a .png filename whose bytes contain text. Confirm no Cloudinary upload occurs.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Isolate Cloudinary stream upload behind an adapter

**File illustrated:** `src/config/cloudinary.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'node:stream';

// Adapter examples: configure CLOUDINARY_* values at startup, not here.
export const images = {
  upload(buffer) {
    return new Promise((resolve, reject) => {
      const writable = cloudinary.uploader.upload_stream(
        { folder: 'basit-marketplace', resource_type: 'image' },
        (error, result) => error ? reject(error) : resolve({
          publicId: result.public_id, url: result.secure_url,
        }),
      );
      // Stream from bounded in-memory Buffer; avoid base64 in MongoDB.
      Readable.from(buffer).pipe(writable);
    });
  },
  destroy(publicId) { return cloudinary.uploader.destroy(publicId); },
};
```

**Why this code exists:** Production adapters can be swapped with fake upload/destroy implementations in tests.

**Try it:** Replace this adapter with a fake and verify that services still work.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Rollback partial image uploads and persist failed destroys

**File illustrated:** `src/services/images.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing, Cleanup } from '../models/index.js';

export function makeImageService({ imageProvider }) {
  async function destroyOrQueue(publicId) {
    try { await imageProvider.destroy(publicId); }
    catch (error) {
      // Durable retry record when the external destroy fails.
      await Cleanup.updateOne({ publicId }, {
        $setOnInsert: { publicId },
        $inc: { attempts: 1 }, $set: { lastError: String(error.message).slice(0, 500) },
      }, { upsert: true });
    }
  }
  return async function addImages({ ownerId, adId, files }) {
    const ad = await Listing.findOne({ _id: adId, owner: ownerId, deleted: false });
    if (!ad) { const e = new Error('Not found'); e.status = 404; throw e; }
    if (!['draft','pending','published'].includes(ad.status) || ad.images.length + files.length > 8) {
      const e = new Error('Invalid gallery'); e.status = 422; throw e;
    }
    const uploaded = [];
    try {
      // Sequential uploads bound provider concurrency at cost of latency.
      for (const file of files) uploaded.push(await imageProvider.upload(file.buffer));
      ad.images.push(...uploaded);
      if (ad.status === 'published') ad.status = 'pending';
      return await ad.save(); // VersionError -> HTTP 409 in error middleware
    } catch (error) {
      for (const img of uploaded) await destroyOrQueue(img.publicId);
      throw error; // Never leak provider error details to HTTP clients.
    }
  };
}
```

**Why this code exists:** MongoDB and Cloudinary do not share a transaction. Compensation handles ordinary failures, while crash orphans still need reconciliation.

**Try it:** Make the second upload fail and the first destroy fail. Assert a durable Cleanup record exists.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Save metadata before destroying external media

**File illustrated:** `src/services/images.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Listing, Cleanup } from '../models/index.js';

export async function removeImage({ adId, ownerId, publicId, imageProvider }) {
  const ad = await Listing.findOne({ _id: adId, owner: ownerId, deleted: false });
  if (!ad) { const e = new Error('Not found'); e.status = 404; throw e; }
  const index = ad.images.findIndex((img) => img.publicId === publicId);
  if (index < 0) { const e = new Error('Not found'); e.status = 404; throw e; }
  ad.images.splice(index, 1);
  if (ad.status === 'published') ad.status = 'pending';
  await ad.save(); // first commit metadata, version-guard concurrent writes
  try { await imageProvider.destroy(publicId); }
  catch (error) {
    // Record durable work rather than lying that provider deletion succeeded.
    await Cleanup.updateOne({ publicId },
      { $setOnInsert: { publicId }, $inc: { attempts: 1 },
        $set: { lastError: String(error.message).slice(0, 500) } },
      { upsert: true });
  }
  return { removed: true };
}
// Note: complete lifecycle checks (e.g., sold/archived restrictions) belong
// here too; add them before copying this excerpt into your real project.
```

**Why this code exists:** Do not delete from Cloudinary before a Mongo save that might fail. The cleanup record allows retry.

**Try it:** Force destroy to fail; confirm image metadata is removed and Cleanup persists.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Administrator cleanup retry

**File illustrated:** `src/services/images.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { Cleanup } from '../models/index.js';

export async function retryCleanup({ imageProvider }) {
  // Admin-only endpoint: bounded batch size protects provider cost/latency.
  const jobs = await Cleanup.find().sort({ _id: 1 }).limit(100);
  for (const job of jobs) {
    try {
      await imageProvider.destroy(job.publicId);
      await Cleanup.deleteOne({ _id: job.id });
    } catch (error) {
      await Cleanup.updateOne({ _id: job.id }, {
        $inc: { attempts: 1 },
          $set: { lastError: String(error.message).slice(0, 500) } });
    }
  }
  return { examined: jobs.length };
}
```

**Why this code exists:** Failures are expected and tracked; the endpoint is not a background worker.

**Try it:** Seed two jobs with one fake success and one fake failure; assert the correct records remain.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### External media cleanup job model

**File illustrated:** `src/models/index.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  publicId: { type: String, unique: true, required: true },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: '' },
}, { timestamps: true });
export const Cleanup = mongoose.model('Cleanup', schema);
```

**Why this code exists:** Provider asset IDs uniquely identify retry work across multiple failures.

**Try it:** Simulate two failures for the same publicId and verify no duplicate job is created.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

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
