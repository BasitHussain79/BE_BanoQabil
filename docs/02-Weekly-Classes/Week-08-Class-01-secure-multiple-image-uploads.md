# Week 08 · Class 01 — Secure Multiple-Image Uploads

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Validate bounded binary inputs before external media storage.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. A text file renamed .png must fail signature validation.

## 3. Concepts covered

- Multer memory
- 5×5 MiB
- gallery 8
- MIME vs magic bytes
- streaming

## 4. Real-world example

A text file renamed .png must fail signature validation.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Owner/auth→Multer→gallery/checks→file-type→Cloudinary→Listing save.

## 7. Database flow

Listing.images stores publicId and secure URL; versioning defends concurrent edits.

## 8. Files involved

- `src/services/images.js`
- `src/config`
- `src/models/index.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Upload actual JPEG PNG WebP, mismatched MIME, fake data, six files, >5 MiB, >8 gallery.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

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

### Explain the request end to end

1. **Input:** Which HTTP fields come from the client? Which values must be derived from the current User or database?
2. **Policy:** Point to the authentication, role, owner, participant, validation or state check.
3. **Database/provider effects:** Identify the conditional query, schema/index, and any SMTP/Cloudinary operation.
4. **Failure:** Predict HTTP status AND durable state when one operation fails.
5. **Evidence:** Capture a successful request, a denied request, and a database or fake-provider assertion.

## 10. Code explanation / tracing exercise

Write a five-column trace table: **route** | **validator/middleware** | **service rule** | **database/provider operation** | **public response**. Fill it from the actual source, not from assumed Express scaffolding. If a source snippet is absent, leave its exact identifier as `verify in source`.

## 11. Best practices

- Keep user-controlled input distinct from server-derived identity, role, owner, participant, and status.
- Use bounded validation and purpose-built queries rather than forwarding raw request objects to the database.
- Test persistent state, not just the HTTP status.
- Explain omitted features accurately: no React dashboard, payments, WebSockets, or deployed infrastructure in this project.

## 12. Common mistakes

Trust extension, unbounded memory, storing base64. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Submit image upload success/rejection matrix.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Images and Cloudinary](../01-API-and-System-Topics/05-Images-and-Cloudinary.md)
- [Validation and Operational Limits](../01-API-and-System-Topics/12-Validation-and-Operational-Limits.md)

[Return to course index](../README.md)
