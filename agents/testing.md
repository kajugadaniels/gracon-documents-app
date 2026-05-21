# Testing Rules

Purpose: protect editor behavior, signing immutability, import/export parity, and auth handoff from regressions.

## Commands

```bash
npm run test
npm run build
npm run lint
```

Use the smallest command that proves the change. For docs-only changes, no build is required.

## Priority Areas

1. Signed/locked read-only behavior.
2. Layout/export parity for margins, indents, line spacing, hanging indents, and tab stops.
3. DOCX/PDF import helpers for paragraph layout and content preservation.
4. Safe URL normalization for editor links and hosted images.
5. Invitation acceptance, OTP, identity verification return, and safe redirect behavior.
6. Print-preview cleanup of hidden DOM hosts, timers, and refs.
7. Autosave skip behavior for unchanged TipTap JSON.

## Test Placement

- Put pure helper tests under `test/export`, `test/import`, `test/editor`, or beside helpers where existing patterns do.
- Prefer pure tests for layout/import/export helpers.
- Use component or integration tests only when behavior depends on React rendering.
- Avoid real network, S3, signature API, or auth API calls in frontend unit tests.
