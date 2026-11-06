# Source Verification Checklist

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

Use this file when you have the actual `project-01-olx` repository to upgrade documentation from README-derived to code-verified.

## Code-to-document alignment

- [ ] Compare all method/path combinations in `src/routes` against `03-Reference/01-Complete-API-Inventory.md`.
- [ ] Record precise request payloads for category, conversation create, report create, moderation decision, account change.
- [ ] Confirm output shape and status per endpoint from tests/Postman.
- [ ] Confirm exact versions from `package.json` + lockfile.
- [ ] Confirm env validation and secret min length in configuration.
- [ ] Read auth service for OTP generation, hashing, attempts, atomic match and SMTP failure state.
- [ ] Read JWT auth middleware for verified/active/current role behavior.
- [ ] Confirm category reference and child counters, reservation and compensating failure branches.
- [ ] Trace all listing transitions and visibility queries.
- [ ] Trace Multer request counts and file signatures, Cloudinary result/storage, Cleanup retry and crash orphans.
- [ ] Confirm Favorite/Conversation/Report unique indexes and concurrency results.
- [ ] Verify safe error redaction in all provider failures.
- [ ] Run `npm test` locally and record pass/fail count, runtime versions and environment warnings.

## Documentation maintenance

After changing a route, update: route validator → Postman collection → topic guide → API inventory → class exercise if relevant → tests. Never claim tests passed without running them.
