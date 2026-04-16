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
- Premium page setup dialog, persisted margins, and draggable ruler-based margin adjustment
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
- Persisted document layout model powering paper margins, rulers, PDF, and DOCX export
- Preset-driven page setup with live printable-area preview for margin tuning
- Horizontal ruler handles for direct left/right margin editing on the page canvas
- Selection-aware ruler markers for active paragraph left-indent and first-line-indent readout
- Draggable paragraph ruler markers that write left-indent and first-line-indent back into editor content
- Explicit multi-block ruler feedback for mixed paragraph indentation selections
- Paragraph tab stops stored in editor content, shown on the ruler, editable by double-clicking the ruler, and preserved in DOCX export
- DOCX import maps Word paragraph indents, inline tab characters, and paragraph tab-stop positions back into the same schema-backed layout model used by the ruler
- Export parity tests for page margins, paragraph indents, hanging indents, and tab-stop conversion
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
  document-layout.ts       shared paper-layout normalization and css-var helpers
  import-docx-layout.ts    DOCX paragraph-layout import conversion helpers
test/
  export/                  pure layout/export conversion regression tests
  import/                  pure DOCX import-layout conversion regression tests
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
- Keep page layout data consistent across editor rendering and export
- Treat invitation review as a security-sensitive flow, not a simple share acceptance

## Contribution Checklist

- Verify permission behavior before changing document actions
- Keep editor changes isolated from auth behavior unless the flow truly crosses apps
- Test invitation, share, signing, and public verify flows after document-domain changes
