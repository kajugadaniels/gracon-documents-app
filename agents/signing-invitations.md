# Signing And Invitation Rules

Purpose: keep sharing, invitation gates, readiness checks, signing, signing evidence, and lock behavior clear and secure.

## Sharing

- Share-dialog verification defaults come from user-owned settings through the same-origin documents proxy.
- Defaults only preselect UI options. Backend enforcement remains in `api/documents`.
- Permission assignment must stay clear and visible.
- Invitation review should show required gates and proof-chain state without overwhelming the user.

## Invitation Acceptance

- Login is always required for accepting secure document invitations.
- Email OTP and identity verification must be handled as explicit gates.
- Return-to-invitation flows must preserve safe URLs and recover cleanly after verification.

## Signing Readiness

- Use the signing-readiness endpoint before opening the signing modal.
- Route the user to login, identity verification, certificate setup, or signing based on readiness result.
- Reuse one readiness state across header, progress panel, and modal return flow where practical.

## Signing UI

- The signing modal should submit through the local BFF route that calls `api/signature` and records the result in `api/documents`.
- Do not expose private key or certificate internals in the browser UI.
- Signing progress belongs in the right rail and must not move the top ruler, left ruler, paper canvas, or export geometry.

## Signed Evidence

- Signed and locked documents must display signature imagery or digitally signed evidence where expected.
- QR verification should remain centered at the bottom of the signed page surface.
- Signed/locked read-only behavior must stay covered by regression tests.
