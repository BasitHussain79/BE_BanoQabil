# Errors and HTTP Statuses

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

Public response contracts and robust mapping of validation, authorization, concurrency, media and unexpected failures.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `ALL` | `/api/*` | Varies | Success: `{ "data": ... }`; failure: `{ "error": "..." }` |
| `GET` | `/health` | Public | Exception: direct health object |

## How the implementation works

1. Transport/validators reject invalid input before service operations.
2. Services throw status-bearing AppError for expected state/permission conflicts.
3. Express 5 forwards rejected async handler work to final error middleware.
4. Map duplicate-key and Mongoose VersionError to 409.
5. Map cast/schema/validation errors to 422.
6. Malformed JSON can map to 400; OTP invalid/replay/expiry can map to 400.
7. Unexpected database/SMTP/Cloudinary errors become redacted 500; log appropriate operator detail separately without secrets.
8. When external calls partially succeed, compensate before error propagation, and inspect persistent state.

## Invariants and exact boundaries

- 200 read/update/action; 201 create/image upload.
- 400 invalid/expired/replayed/locked OTP or malformed JSON.
- 401 missing/invalid/expired Bearer or unavailable authenticated identity.
- 403 insufficient role or unverified/inactive login.
- 404 missing resource or private owner/participant mismatch.
- 409 duplicate, stale version, invalid transition or unsafe delete.
- 422 validation/cast/schema/upload error; 429 limit/cooldown; 500 redacted unexpected failure.

## Database responsibilities

- Unique indexes may throw duplicate-key failures.
- Listing optimistic `__v` may yield VersionError.
- Cleanup holds failed provider-deletion retry work.

## Request or design example

```json
{"data": {"example": "successful /api payload shape"}}
```

```json
{"error":"safe public message"}
```

These are **shape examples**, not exact literal response bodies for any specific endpoint.

## Verification checklist

- [ ] Assert response object and stored state for 200/201/400/401/403/404/409/422/429/500.
- [ ] Trigger malformed JSON containing a fake secret; ensure it is not echoed.
- [ ] Inject SMTP error with a secret string; verify response redaction.
- [ ] Force duplicate index and stale-save errors; verify 409 classification.

## Common mistakes

- Returning raw `error.message` from unknown providers.
- Testing only HTTP status without checking MongoDB effect.
- Sending response after headers are already sent.
- Treating all invalid transitions as 422 rather than documented 409.

## Practical assignment

Build an error catalog: trigger, exact observed status, safe public response, database state, operator action, and a regression test for each failure family.

## Source files to inspect

- `src/utils/errors.js`
- `src/middleware/errors.js`
- `src/controllers/http.js`
- `src/services/`
- `tests/core.test.js`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
