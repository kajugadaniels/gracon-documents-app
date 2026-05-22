# Security Rules

Purpose: protect document access, invitation proof chains, signing workflows, shared sessions, and private assets.

## Auth And Cross-App Handoff

- Use hard navigation when redirecting to `app/app`.
- Production auth must validate shared session cookies through local route handlers.
- Do not add production code that depends on reading refresh tokens from `document.cookie`.
- Keep local development login/readable-cookie compatibility intact.
- Logout must flow through documents `/api/logout` before returning to the documents `/login` route.
- Profile and Settings account-menu links may leave the documents app, but only to the configured identity-app origin.

## Invitations

- Invitation review is security-sensitive, not a simple share acceptance.
- Verification defaults are UI preselection only; `api/documents` enforces the actual gates.
- Email OTP and identity verification return flows must preserve safe `next` values.
- Do not reveal raw invitation tokens, verification internals, or private collaborator metadata in UI errors.

## Signing And Locking

- Reflect backend workflow exactly: finalise, sign, then owner lock.
- Signing readiness should come from the backend readiness endpoint.
- After signing, the editor must become read-only immediately without a reload.
- Signed, finalised, and locked immutability belongs in centralized readonly helpers.
- Owner lock must remain confirmed, not one-click accidental mutation.

## Assets And Profile Images

- Profile avatars must render through `/api/profile-image` and `UserAvatar` fallback.
- Do not put raw presigned S3 profile-image URLs directly into header/editor DOM.
- Editor images must be hosted through `api/documents`; block base64 image storage in document JSON.
- Never expose storage credentials, raw S3 keys, or private render-token internals in client UI.

## Public Verification

- Public verification UI must display authenticity state without exposing private document content.
- QR verification placement must stay consistent between editor evidence, print preview, and export.
