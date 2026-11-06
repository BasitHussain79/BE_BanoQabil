# Complete API Inventory

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

Canonical route list reconstructed from the supplied README's API Reference section. All `/api` successes use a `data` wrapper and failures use an `error` wrapper. `/health` is an exception.

| Method | Path | Access | Purpose | Topic |
|---|---|---|---|---|
| `GET` | `/health` | Public | Process status and uptime | Health and Authentication |
| `POST` | `/api/auth/signup` | Public; auth limit | Create unverified user and initiate OTP email | Health and Authentication |
| `POST` | `/api/auth/verify` | Public; auth limit | Consume verification OTP | Health and Authentication |
| `POST` | `/api/auth/resend` | Public; auth limit | Replace eligible OTP after cooldown | Health and Authentication |
| `POST` | `/api/auth/login` | Public; auth limit | Issue JWT and public user | Health and Authentication |
| `POST` | `/api/auth/logout` | Authenticated | Client deletes its token; no server-side revocation | Health and Authentication |
| `GET` | `/api/users/me` | Authenticated | Return safe profile | Profiles and Users |
| `PATCH` | `/api/users/me` | Authenticated | Change name and optional city/phone | Profiles and Users |
| `PATCH` | `/api/users/me/password` | Authenticated | Confirm current password and change it | Profiles and Users |
| `DELETE` | `/api/users/me` | Authenticated | Deactivate own account | Profiles and Users |
| `GET` | `/api/users` | Admin | Paginated public-user projections | Profiles and Users |
| `PATCH` | `/api/users/:id` | Admin | Change another user role and active flag | Profiles and Users |
| `GET` | `/api/categories` | Public | List up to 500 active categories | Categories |
| `POST` | `/api/categories` | Admin | Create root or one-level child | Categories |
| `PATCH` | `/api/categories/:id` | Admin | Update name/active state | Categories |
| `DELETE` | `/api/categories/:id` | Admin | Remove only without children or active listing references | Categories |
| `GET` | `/api/ads` | Public | Published nondeleted ads with discovery filters | Ads and Listing Lifecycle |
| `GET` | `/api/ads/mine` | Authenticated | Owned ads, including private drafts | Ads and Listing Lifecycle |
| `POST` | `/api/ads` | Authenticated | Create draft; owner derived server-side | Ads and Listing Lifecycle |
| `GET` | `/api/ads/:id` | Public | Published nondeleted detail only | Ads and Listing Lifecycle |
| `PATCH` | `/api/ads/:id` | Owner | Partially edit allowed fields | Ads and Listing Lifecycle |
| `POST` | `/api/ads/:id/publish` | Owner | Draft with image → pending | Ads and Listing Lifecycle |
| `POST` | `/api/ads/:id/sold` | Owner | Published → sold | Ads and Listing Lifecycle |
| `POST` | `/api/ads/:id/delete` | Owner | Archive/soft-delete allowed state | Ads and Listing Lifecycle |
| `POST` | `/api/ads/:id/images` | Owner | Upload up to five bounded images | Images and Cloudinary |
| `DELETE` | `/api/ads/:id/images` | Owner | Remove an image by publicId in JSON | Images and Cloudinary |
| `POST` | `/api/moderation/cleanup` | Admin | Retry up to 100 failed provider destroys | Images and Cloudinary |
| `GET` | `/api/favorites` | Authenticated | Paginate favorites whose listings remain public | Favorites |
| `PUT` | `/api/favorites/:id` | Authenticated | Save public listing idempotently | Favorites |
| `DELETE` | `/api/favorites/:id` | Authenticated | Remove relationship idempotently | Favorites |
| `GET` | `/api/conversations` | Authenticated | List current user participating threads | Conversations and Messages |
| `POST` | `/api/conversations` | Authenticated | Open/reuse a thread for published ad | Conversations and Messages |
| `GET` | `/api/conversations/:id/messages` | Participant | Page newest-first message history | Conversations and Messages |
| `POST` | `/api/conversations/:id/messages` | Participant | Store text message, 1–2000 characters | Conversations and Messages |
| `POST` | `/api/reports` | Authenticated | One report per reporter/public listing | Reports and Moderation |
| `GET` | `/api/moderation/reports` | Moderator/Admin | List unresolved report queue | Reports and Moderation |
| `POST` | `/api/moderation/reports/:id/resolve` | Moderator/Admin | Mark report resolved | Reports and Moderation |
| `GET` | `/api/moderation/ads` | Moderator/Admin | List pending listings | Reports and Moderation |
| `POST` | `/api/moderation/ads/:id` | Moderator/Admin | Approve/reject pending listing | Reports and Moderation |

## Notes

- Do not interpret `buyer`/`seller` as separate `User.role` values.
- Confirm JSON field names in validators/Postman before documenting request bodies that the README does not show.
- There is no payment/checkout, browser dashboard, WebSocket chat, password reset or refresh-token endpoint.

[Back to index](../README.md)
