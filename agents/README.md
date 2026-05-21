# App Documents Agent Guide

Purpose: this directory gives AI agents project-local rules for working on the Gracon documents frontend without breaking the editor, document canvas, invitation flow, signing workflow, print preview, export parity, or shared-auth handoff.

Read this file first, then read the topic file that matches the change.

## Reading Order

1. `folder-structure.md` - where routes, editor components, document components, stores, and helpers belong.
2. `file-structure.md` - naming, comments, exported APIs, and CSS-module expectations.
3. `security.md` - invitation, auth handoff, profile image, signing, and public verification safety.
4. `auth-session.md` - local development login, production shared sessions, logout, and cross-app redirects.
5. `editor-canvas.md` - TipTap ownership, paper geometry, page layout, ruler, print preview, and export rules.
6. `signing-invitations.md` - sharing, verification defaults, readiness, signing, and locking rules.
7. `ui-design.md` - document workspace, loading, modules, and responsive design rules.
8. `testing.md` - required test shape and priority areas.
9. `documentation.md` - when README, `.env.example`, and architecture docs must change.
10. `git.md` - copy-paste commit format for this app.

## App Boundary

`app/documents` owns the document workspace UI: documents, templates, editor, page setup, share UX, invitation acceptance, signing UI, print preview, export, public verification, and document-specific loading/recovery states.

It must not own identity verification UI, token issuance, personal key material, S3 credentials, or backend permission enforcement.

## Conflict Rule

If a local rule here conflicts with root `AGENTS.md`, follow the stricter security rule and update documentation after the decision is made.
