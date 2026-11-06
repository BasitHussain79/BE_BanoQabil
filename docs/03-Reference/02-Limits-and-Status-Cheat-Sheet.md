# Validation, HTTP Status and Operational Limits — Cheat Sheet

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Input boundaries

| Setting | Documented limit |
|---|---|
| JSON request body | 32 KiB |
| App rate limit | 300/IP/process/60 seconds |
| Auth rate limit | 30/IP/process/60 seconds |
| Password | 12–72 chars and ≤72 UTF-8 bytes |
| OTP | 6 digits, 10 min, <5 failed attempts, 60-second resend |
| JWT | HS256, issuer basit-marketplace, audience marketplace-client, 1 day |
| Images | JPEG/PNG/WebP; 5/request; 5 MiB/file; 8/listing |
| Listing title | 5–100 characters |
| Listing description | 20–3000 characters |
| Listing price | 1–1,000,000,000 |
| Message text | 1–2000 characters |
| Report reason | 5–1000 characters |
| Search q | max 100 characters |
| Search city | max 80 characters |
| Price filter | 0–1,000,000,000 |
| Page / limit | 1–1000 (default 1) / 1–50 (default 20) |
| Categories GET | up to 500 active categories |
| Cleanup retry | up to 100 jobs |

## HTTP statuses

| Code | Documented meaning |
|---|---|
| 200 | Successful read/update/action |
| 201 | Created record or uploaded images |
| 400 | Invalid/replayed/expired/locked OTP, or malformed JSON |
| 401 | Missing/bad/expired Bearer or unavailable protected identity |
| 403 | Insufficient role; unverified/inactive login |
| 404 | Missing resource/route or hidden private mismatch |
| 409 | Duplicate, stale version, unsafe deletion, invalid state transition |
| 422 | Validation, cast/schema, upload failure |
| 429 | Rate limit / resend cooldown |
| 500 | Redacted unexpected/provider error |

Consult [Errors and HTTP Statuses](../01-API-and-System-Topics/13-Errors-and-HTTP-Statuses.md) and the actual source tests for per-route exact values.
