# Documentation Rules

Purpose: keep document frontend behavior clear for future contributors.

## Update Documentation When

- Auth/session handoff behavior changes.
- Invitation acceptance, verification defaults, OTP, or identity return flows change.
- Editor page geometry, ruler, print preview, export, import, or layout metadata behavior changes.
- Signing readiness, signing modal, signing evidence, or lock behavior changes.
- Loading/recovery component patterns change.
- Environment variables are added, renamed, or removed.

## Required Places

- `app/documents/README.md` for app-local architecture and rules.
- `app/documents/.env.example` for new configuration.
- `app/documents/docs/` for larger architecture plans such as pagination/export design.
- Root `AGENTS.md` only when cross-project platform architecture changes.
- Backend README files when frontend behavior requires API contract changes.

## Documentation Quality

- Explain the user flow and the security or export-parity reason.
- Mention development vs production behavior when auth or cookie behavior differs.
- Keep compatibility notes for existing signed documents and imported content.
