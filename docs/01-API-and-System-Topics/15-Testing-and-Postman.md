# Testing and Postman

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

End-to-end manual verification via Postman and repeatable integration tests using a disposable database, fake providers and controlled time.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Initial smoke test |
| `ALL` | `/api/*` | Varies | Positive and negative journey across modules |

## How the implementation works

1. Install with `npm ci`, copy `.env.example` and configure secrets, MongoDB and SMTP.
2. Use Mailpit/SMTP capture for real OTP manual flow; add Cloudinary for actual uploads.
3. Import `postman/collection.json` and `postman/environment.json`.
4. Run Postman in order so tokens/IDs are captured for dependent requests.
5. Set up verified/admin accounts and seed category before listing creation.
6. Execute publish/approve/search/favorite/conversation/report/sold/delete with real JPEG/PNG/WebP.
7. Run `npm test`; Supertest exercises createApp with fake adapters and MongoDB Memory Server.
8. Add controlled-time OTP and provider-failure tests; assert HTTP and persisted state.

## Invariants and exact boundaries

- Tests use Node built-in test runner, Supertest 7.1, MongoDB Memory Server 10.2.
- `createApp(dependencies)` accepts injected email/image/time fakes.
- Automated tests should be deterministic and not depend on real provider credentials.
- A restrictive runtime may cause `listen EPERM` in MongoDB Memory Server; verify on an allowed local environment.
- Running Postman out of order produces stale/missing variables; do not export secrets.

## Database responsibilities

- Disposable MongoDB verifies actual indexes and state invariants.
- Fakes observe OTP sends, Cloudinary uploads/destroys, and elapsed time.

## Request or design example

```bash
npm ci
cp .env.example .env
npm start
curl http://localhost:4000/health
npm test
```

The shell commands are from the README. Configure MongoDB and any SMTP/Cloudinary providers before corresponding manual steps.

## Verification checklist

- [ ] OTP replay and concurrent correct verify requests.
- [ ] Role/current-user checks and private 404.
- [ ] Listing state guards, public filters, and category reservations.
- [ ] Upload partial failure, Cleanup persistence and recovery.
- [ ] Favorite/thread/report uniqueness and message privacy.
- [ ] HTTP response plus database effect after every expected failure.

## Common mistakes

- Mocking all persistence and thereby missing index behavior.
- Testing only 200 paths.
- Using test images with fake bytes.
- Treating sandbox `EPERM` as proof of a logic defect.

## Practical assignment

Submit one ordered Postman collection run and design at least one automated test each for concurrency, privacy, provider failure and state transitions.

## Source files to inspect

- `postman/collection.json`
- `postman/environment.json`
- `tests/core.test.js`
- `src/app.js`
- `package.json`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
