# Auth And Session Rules

Purpose: keep local development login, production shared sessions, refresh, logout, and cross-app redirects predictable.

## Ownership

- `app/app` owns identity UI and shared login.
- `app/documents` owns document UI and redirects to `app/app` when login or identity verification is required.
- `api/documents` owns document permission enforcement.

## Development Compatibility

- Keep the local documents login available for development.
- Keep readable-cookie development compatibility controlled by environment flags.
- Do not remove the development path while production shared-cookie migration is still supported.

## Production Sessions

- Production should use `NEXT_PUBLIC_DOCUMENTS_USE_MAIN_APP_LOGIN=true`.
- Production should disable readable auth cookies.
- Validate shared sessions server-side through local route handlers such as `/api/session`, `/api/me`, and `/api/refresh`.
- Treat `session_active` as a hint only.

## Logout

- Document UI should call `logoutFromDocuments()`.
- Local documents cookies should be cleared before handoff to `app/app`.
- Never redirect login back to `/logout` as `next`.

## Redirects

- Use hard navigation for cross-origin app jumps.
- Preserve invitation or document return paths only when safe.
- Keep identity verification redirects pointed to `app/app`; do not re-add standalone identity verification UI here.
