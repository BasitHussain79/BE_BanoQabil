# Verify the annotated examples against the actual repository

## Why this step matters

The supplied README describes business rules and file paths, but does not reveal complete function bodies, schema field naming, or initialization. Code examples here are **new teaching samples**. Do not present them as copied from your repository or say a pasted snippet is production-ready.

## When you have the source

1. Compare each path label with its actual exported function names.
2. Check that Mongoose field names agree (`otp.hash` is a teaching example, not a verified actual field name).
3. Verify route mounting and exact validators in `src/routes` and `src/validators`.
4. Check service return shapes against `{data: ...}` for HTTP and `error` for failures.
5. Inspect tests, especially simultaneous OTP consume, category counter reservation, media compensation, private 404, and version conflicts.
6. Compare Postman IDs and variable names against your imported collection.
7. Only after merging, run the actual project `npm ci`, `npm test`, and a full Postman sequence using dev credentials.

## Syntax checks performed on illustrative excerpts

Each JavaScript code block can be parsed with Node ESM syntax. Syntax checking does **not** show that excerpts from different guides can be pasted together, imported by existing source, or execute without all dependencies/fixtures.

## Important distinctions

- Verification OTPs are one-time state on User, not a separate OTP collection.
- Roles are `user`, `moderator`, `admin`; buyer/seller are personas.
- Publishing requires media and moderation; `status` is never a client-trusted field.
- Favorites/conversations are stored, not checkout/real-time payments/chat.
- Cloudinary/MongoDB use compensation, not cross-provider transactions.
- Rate limits are per-process, not shared between replicas.
- Logout/password change do not revoke JWTs in the documented implementation.
- The project has no frontend, deployment pipeline, or complete observability platform.
