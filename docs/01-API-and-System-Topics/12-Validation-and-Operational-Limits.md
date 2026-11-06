# Validation and Operational Limits

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

Input shape/bounds, upload limits, rate limiting, and safe source-to-service contracts.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `ALL` | `/api/*` | Varies | Validated JSON or multipart request boundaries |
| `POST` | `/api/auth/*` | Public; auth limit | Sensitive auth rate limit |
| `POST` | `/api/ads/:id/images` | Owner | File/gallery bound enforcement |

## How the implementation works

1. Apply app-level rate limit and 32 KiB JSON parser before route logic.
2. Validate body, URL params, and query with express-validator.
3. Coerce only known query numeric fields and whitelist accepted properties.
4. Apply route-level auth limiter for costly/sensitive endpoints.
5. Validate file count/size with Multer before provider requests.
6. Inspect actual bytes against MIME; enforce total gallery limit.
7. Normalize caught validation failures into safe `error` contract.

## Invariants and exact boundaries

- App limit: 300 requests per IP per process per 60 seconds.
- Auth limit: 30 requests per IP per process per 60 seconds.
- JSON body limit: 32 KiB.
- Password: 12–72 characters and ≤72 bytes.
- Listing title 5–100, description 20–3000, price 1–1,000,000,000.
- Message 1–2000; report reason 5–1000.
- Upload 5 files/request × 5 MiB/file, 8 gallery images.
- Pagination page 1–1000, limit 1–50.
- Limits must be redesigned for multi-replica production deployments.

## Database responsibilities

- Mongoose schema validation and unique indexes act as second-line invariants.
- Memory rate-limit maps are process-local; not database-backed.

## Request or design example

```http
GET /api/ads?page=0&limit=500
```

The malformed pagination must be rejected by validation, not silently expanded to an expensive query.

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

### Validate input at the HTTP boundary

**File illustrated:** `src/validators/ads.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { body, param, query, validationResult } from 'express-validator';

// PATCH accepts only fields the service can safely apply.
export const adTitle = body('title').optional().isString().trim().isLength({ min: 5, max: 100 });
export const adPrice = body('price').optional().isFloat({ min: 1, max: 1_000_000_000 });
export const adId = param('id').isMongoId();
export const listPage = query('page').optional().isInt({ min: 1, max: 1000 });
export const listLimit = query('limit').optional().isInt({ min: 1, max: 50 });

export function requireValid(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    // Do not echo raw request bodies or sensitive rejected input.
    return res.status(422).json({ error: 'Invalid request' });
  }
  next();
}
```

**Why this code exists:** HTTP boundary validation complements Mongoose schema validation and DB uniqueness.

**Try it:** Send a page=1001 and a malformed ObjectId; confirm they are rejected before reaching a service.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Normalize and validate registration input

**File illustrated:** `src/validators/auth.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { body } from 'express-validator';

export const signupRules = [
  body('name').isString().trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 12, max: 72 })
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72),
];
// Verify rule set is paired with requireValid on the route.
// Validation is not authorization: do not accept role / active / verified.
```

**Why this code exists:** Length validation must check both Unicode character and UTF-8 byte boundaries.

**Try it:** Try 72 multi-byte characters and show the 72-byte bcrypt boundary still rejects it.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Educational in-process sliding window

**File illustrated:** `src/middleware/limits.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
export function localWindowLimit({ max, windowMs = 60_000, now = () => Date.now() }) {
  const store = new Map(); // local to ONE Node process, not distributed
  return (req, res, next) => {
    const ip = req.ip; // configure trust proxy EXACTLY for your ingress
    const bucket = store.get(ip);
    const current = now();
    const entry = !bucket || current - bucket.started >= windowMs
      ? { started: current, count: 0 } : bucket;
    entry.count += 1;
    store.set(ip, entry);
    if (entry.count > max) return res.status(429).json({ error: 'Too many requests' });
    next();
  };
}
// Example wiring: app.use(localWindowLimit({ max: 300 }));
// Auth routes additionally use localWindowLimit({ max: 30 }).
// Educational example: implement eviction and shared atomic limits in production.
```

**Why this code exists:** In-memory maps have different counts per process and need cleanup; they are NOT a cluster-wide defense.

**Try it:** Explain behavior with two replicas and why shared storage and correct proxy config are needed.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

## Verification checklist

- [ ] Oversized JSON, malformed JSON, unknown/unaccepted keys.
- [ ] Boundary length and invalid numeric query values.
- [ ] 31 auth requests from one IP in 60 seconds, with isolated test clock as appropriate.
- [ ] Oversized/fake uploads and too many files.
- [ ] State still correct after denied requests; no sensitive detail leaks.

## Common mistakes

- Using validation instead of authorization.
- Treating an IP-local memory map as a global distributed limiter.
- Trusting proxy IP headers without exact proxy configuration.
- Assuming CORS is a bearer-token authorization mechanism.

## Practical assignment

Prepare a request-boundary checklist with input, expected HTTP code, whether database/provider work happens, and the state after denial.

## Source files to inspect

- `src/app.js`
- `src/validators/`
- `src/middleware/`
- `src/services/images.js`
- `src/models/index.js`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
