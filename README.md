# App Documents

Rich-text document workspace for the Gracon platform.

This application lets users create, organize, edit, share, sign, verify, and review documents. Identity stays in `app/app`; this app focuses on the document experience and redirects to the main app when login or identity verification is required.

## Overview

- Runtime: Next.js 15 + React + TypeScript
- Default port: `4002`
- Styling: Tailwind CSS
- State: Zustand + sessionStorage
- Editor: Tiptap / ProseMirror
- Document domain: folders, templates, collaboration, invitations, signing, verification

## What This App Owns

- Document list, creation, rename, copy, delete, and import UX
- Rich-text editing and autosave experience
- Share dialog, permission assignment, invitation review
- Signature workflow UI and signing progress
- Public verify page for authenticity checks
- Invitation acceptance flow and proof-chain review

## Core Skills Needed

- Next.js App Router
- Tiptap / ProseMirror editor integration
- Complex state synchronization for document metadata
- Collaboration and permission UX
- Secure cross-app auth handoff

## Techniques Used

- Direct browser calls to `api/documents` for document operations
- Next.js proxy routes for auth refresh/current user and signature operations
- Zustand hydration from sessionStorage plus cookie-backed recovery
- A4-style editor work, autosave, versions, and signing states
- Invitation gate with OTP and identity-proof return flow
- Cross-tab share activity refresh and document metadata merge patterns

## Main Areas

```text
src/app/
  (protected)/documents/   list and protected document workspace routes
  (protected)/templates/   template entry
  api/                     local auth/signature helper routes
  invitations/[token]/     invitation review and acceptance
  login/                   minimal local login handoff
  verify/                  public authenticity page
components/
  editor/                  header, toolbar, sharing, signing, comments
  documents/               document cards and signature strip
  pages/
    auth/login/
    documents/
    invitations/
    verify/
  layout/
  shared/
  ui/
api/
  documents.api.ts
  folders.api.ts
  invitations.api.ts
  signature.api.ts
  templates.api.ts
  client.ts
  auth-retry.ts
lib/
  store/
  hooks/
```

## Folder Structure

```text
app/documents/
  src/
    app/
    api/
    components/
    lib/
    constants/
    types/
  public/
  test/
  package.json
```

## Local Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
```

## Environment Notes

Key variables:

```env
NEXT_PUBLIC_DOCS_URL=http://localhost:4002
NEXT_PUBLIC_APP_URL=http://localhost:4000
NEXT_PUBLIC_DOCUMENTS_API_URL=http://localhost:3005/api/v1
NEXT_PUBLIC_SIGNATURE_API_URL=http://localhost:3002/api/v1
```

## Integration Boundaries

- Talks directly to `api/documents`
- Uses local proxy routes for auth/session recovery and signature endpoints
- Redirects to `app/app` for login and identity verification
- Should not host its own standalone identity-verification UI now

## Important Rules

- Use hard navigation when jumping to `app/app`
- Keep document permissions and signing state separate in the UI
- Reflect the backend workflow correctly: finalise, sign, then owner lock
- Treat invitation review as a security-sensitive flow, not a simple share acceptance

## Contribution Checklist

- Verify permission behavior before changing document actions
- Keep editor changes isolated from auth behavior unless the flow truly crosses apps
- Test invitation, share, signing, and public verify flows after document-domain changes

