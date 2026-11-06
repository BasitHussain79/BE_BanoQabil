# Project 01 — Detailed README Review

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Executive assessment

The README is a comprehensive, security-conscious API curriculum and a strong foundation for instructor-led learning. Its standout features are the difference between marketplace personas and database roles, a guarded listing state machine, OTP race safety, scoped privacy, Cloudinary compensation, and a testable app factory. The document is unusually explicit about features **not** included, which reduces misleading portfolio claims.

This is a **README review**, not a claim that the source code passed an independent audit. The published page was opened, but it did not expose parsable body content. The supplied README, not a repository checkout, is the evidence base.

## What is strong

1. **Honest project scope.** Backend-only, Postman reference client; no invented UI, payments, or live chat.
2. **Clear authorization boundaries.** Role (`user`/`moderator`/`admin`) vs ownership vs conversation participation.
3. **Explicit states.** Listing `draft → pending → published → sold` with rejection/re-review/archive rules.
4. **Database-backed concurrency defenses.** Unique indexes, atomic OTP consume, conditional moderation and category reservations, optimistic Listing versioning.
5. **Provider reliability planning.** Compensation for Cloudinary partial failures and persistent Cleanup retries.
6. **Testability.** `createApp(dependencies)`, fake time/providers, Supertest, and disposable MongoDB.
7. **Realistic operational gap inventory.** TLS, CORS/proxy, shared limits, queues, audits, retention, backups, monitoring.

## Teaching/design improvements made in this documentation pack

- Each functional API domain has its **own Markdown topic file**, including exact known routes, request examples, invariants, failure cases, and assignments.
- Complex combined subjects are split when teaching clarity benefits: **Listings vs Images**, **Search vs Pagination**, **Access Control vs Error Handling**.
- All **26 classes** across **13 weeks** also have separate Markdown handouts, preserving the requested 14-block teaching rhythm.
- One index provides the recommended teaching order; one endpoint inventory provides rapid reference.
- Unknown JSON keys and exact provider methods are marked **verify in source**, not invented.

## Gaps/points to verify against the actual repository

| Review question | Why it matters | Where to verify |
|---|---|---|
| Do README route names and verbs match code? | Docs and Postman must remain synchronized | `src/routes/`, `postman/collection.json` |
| What are the exact JSON keys for moderation/report/conversation/category requests? | README gives endpoints but not all payload schemas | `src/validators/`, Postman |
| Are failure statuses exactly as documented? | Several cases distinguish 400/401/403/404/409/422 | Error middleware and service tests |
| Is SMTP failure after User creation recoverable as described? | Failed signup may leave unverified User | Auth service, OTP resend tests |
| Does category reservation reliably compensate every failure path? | Crash overcount and delete safety are subtle | Marketplace service and concurrency tests |
| Are upload limits and detection applied before provider calls? | Multipart and file-type boundaries are security-sensitive | Routes, image service, tests |
| Can Cleanup recovery avoid deleting currently referenced media? | Production safety needs an explicit asset reconciliation strategy | Image service, Cleanup model, tests |
| Is the public search predicate applied to all queries, including favorites? | Hidden listings must never leak | Listing/favorite service tests |
| Does deployment configure exact trusted proxy/CORS/TLS? | The README lists these as NOT implemented | Runtime/infrastructure files |
| Does package-lock reflect all declared exact versions? | README numbers alone do not prove installed tree | `package.json`, `package-lock.json` |

## Important boundaries to keep visible for students

- A **purchase inquiry is just a stored Message**. There is no money or order.
- **Logout is client-side token disposal**, not bearer revocation. A password change also does not revoke old tokens.
- **GET /health is process liveness only**; do not call it a deep database/provider readiness probe.
- Per-process IP limits are not sufficient under multiple API replicas.
- Cloudinary compensation does not fully cover crash orphan scenarios.
- `q` uses escaped title regex, not dedicated full-text search.
- No totals are returned for paginated collections; avoid documenting `totalPages`.

## Recommended teaching order

Begin with weeks 1–2 (scope, architecture, Mongoose) before introducing security-sensitive OTP and JWT. Do not let students build arbitrary ad-status CRUD before studying roles/ownership and listing transitions. Finish with provider-failure tests and an evidence-based operations review.

## What to add after actual repository access

1. Per-route exact request/response examples captured from the running server.
2. Source path + line anchors for every high-risk business invariant.
3. Verified error/status matrix and Postman test scripts.
4. Test coverage counts/known failing tests (not guessed).
5. API contract diffing/CI so route changes and documentation do not drift.
