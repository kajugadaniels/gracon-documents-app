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

- Document list, creation, rename, copy, delete, and DOCX/PDF import UX
- Rich-text editing and autosave experience
- Premium page setup dialog, persisted margins, and draggable ruler-based margin adjustment
- Share dialog, permission assignment, invitation review
- Signature workflow UI and signing progress
- One-call signing-readiness gating before opening the signing modal
- Same-origin signing BFF route that signs and records document signatures in one UI request
- Prefetched signing state with return-to-modal handoff after identity or certificate setup
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
- Server-side single-flight session refresh/upgrade helpers for auth and signature proxy routes
- Zustand hydration from sessionStorage plus cookie-backed recovery
- A4-style editor work, autosave, versions, and signing states
- Persisted document layout model powering paper margins, rulers, PDF, and DOCX export
- Preset-driven page setup with live printable-area preview for margin tuning
- Horizontal ruler handles for direct left/right margin editing on the page canvas
- Selection-aware ruler markers for active paragraph left-indent and first-line-indent readout
- Draggable paragraph ruler markers that write left-indent and first-line-indent back into editor content
- Explicit multi-block ruler feedback for mixed paragraph indentation selections
- Typed paragraph tab stops stored in editor content, shown on the ruler, editable from the ruler, and preserved in DOCX import/export
- Paragraph line spacing stored in editor content with Google Docs-style toolbar presets and DOCX export parity
- Ruler tab-stop popover for choosing left, center, right, or decimal tab alignment without memorizing shortcuts
- Draggable ruler tab-stop markers for repositioning existing tab stops without deleting and recreating them
- Live editor tab rendering uses ProseMirror decorations so tab characters remain copy/paste-safe while reflecting typed stop widths on canvas
- DOCX import uses the Mammoth-based conversion path with recovered paragraph indents, tab stops, and list styles before TipTap parsing
- PDF import uses PDF.js text extraction to rebuild editable TipTap content with page order, line grouping, indentation, line spacing, font size, and basic bold/italic metadata; scanned image-only PDFs require OCR before import
- Export parity tests for page margins, paragraph indents, hanging indents, line spacing, and tab-stop conversion
- Invitation gate with OTP and identity-proof return flow
- Signing readiness checks from `api/documents` so the UI can route users to login, identity verification, certificate setup, or signing without extra probing calls
- Signing modal submits to a local BFF route that calls `api/signature` and then records the result in `api/documents`, reducing partial browser-side failure states
- Signing actions reuse one readiness state across the header, progress panel, and modal return flow
- Cross-tab share activity refresh and document metadata merge patterns
- Typed insert-menu action registry so menu labels, enabled states, and editor command dispatch stay aligned while features are implemented incrementally
- Quick insert actions for date/time and common special characters using undo-safe TipTap insert commands
- Selection-aware link insertion and editing with safe URL normalization before links enter the TipTap document model
- Schema-backed table cell styling for white/black default tables, editable cell background colors, per-side borders, and DOCX export preservation
- Secure hosted-image insertion from URL or local upload through `api/documents`, with private S3 storage, preview, accessibility metadata, and base64 image storage blocked
- Resizable editor images with persisted TipTap width/height attributes, aspect-ratio-safe corner handles, and polished canvas feedback

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
  editor/                  editor React components only: header, toolbar, sharing, signing, comments
  documents/               document React components only: document cards and signature strip
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
  editor-image.ts          safe editor-image URL normalization helper
  editor-link.ts           safe editor-link URL normalization helper
  import-docx-layout.ts    DOCX paragraph-layout import conversion helpers
store/
  editor/                  editor hooks, TipTap extensions, share sync, and other non-React-component editor logic
  documents/               document-domain helpers that are not React components
test/
  export/                  pure layout/export conversion regression tests
  import/                  pure DOCX/PDF import-layout conversion regression tests
  editor/                  pure editor helper regression tests
```

## Folder Structure

```text
app/documents/
  src/
    app/
    api/
    components/
    store/
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

Editor image storage variables belong in `api/documents`, not this frontend app. Do not expose storage credentials with `NEXT_PUBLIC_`.

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
- Keep `components/editor` and `components/documents` for `.tsx` UI components; put editor/document `.ts` hooks, extensions, sync helpers, and pure state helpers under `src/store/editor` or `src/store/documents`
- Test invitation, share, signing, and public verify flows after document-domain changes
