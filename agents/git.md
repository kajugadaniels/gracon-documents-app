# Git Rules

Purpose: keep documents-app commits reviewable and copy-paste safe.

Codex must never run git commands automatically. Present commands only.

## Required Format

Paths are relative to `app/documents/`, where this app `package.json` lives.

```bash
git add "src/components/editor/DocumentEditor.tsx"
git commit -m "fix(editor): preserve locked readonly state"
```

## Rules

- One file per `git add`.
- Always quote paths.
- Never use `git add .` or `git add -A`.
- Never include `cd app/documents`.
- Never run `git push`.
- Use Conventional Commits.

## Common Scopes

- `documents` - document list, document routes, document-domain UI.
- `editor` - TipTap editor, toolbar, canvas, ruler, print preview.
- `templates` - template UI.
- `invitations` - invitation acceptance and proof review.
- `signature` - signing UI and signature workflow.
- `auth` - local login/session/logout handoff.
- `shared` - shared shell/components.
- `ui` - primitive UI components.
- `docs` - README and agent docs.
