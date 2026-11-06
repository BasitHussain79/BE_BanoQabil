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
