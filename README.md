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
- Browser titles: each route should use the `"{page or document name} | Gracon 360"` convention

## What This App Owns

- Document list, creation, rename, copy, delete, and DOCX/PDF import UX
- Rich-text editing and autosave experience
- Premium page setup dialog, persisted margins, and draggable ruler-based margin adjustment
- Share dialog, permission assignment, invitation review
- Signature workflow UI and signing progress
- Locked-document verification surface, including signed evidence, signature imagery, and QR verification placement
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
- Cross-app auth is moving to the shared Gracon session-cookie contract owned by `app/app` and the auth service. `app/documents` should validate server-side cookies through local route handlers and must not depend on JavaScript-readable refresh tokens in production.
- Logout flows through the local documents `/api/logout` route first, then hands off to `app/app` logout so shared parent-domain cookies are cleared without reloading protected document state first.
- Zustand hydration from sessionStorage plus cookie-backed recovery
- A4-style editor work, autosave, versions, and signing states
- White default workspace background for documents, templates, and protected loading surfaces; the editor canvas owns its own neutral gray paper workspace
- Client-owned protected pages use `useDocumentTitle` for route titles because most document data is loaded through session-aware client state
- Reusable `DocumentLoadingState` keeps protected loading, editor loading, print-preview loading, and signing progress loading visually consistent with a document-specific loading visual and context-aware copy
- Editor and print-preview rendering are protected by scoped recovery boundaries so malformed imported content, images, tables, or extension failures do not crash the whole documents app
- High-risk UI surfaces are being moved out of `globals.css` into scoped CSS modules; signing progress, protected shell, templates page, document list helpers, and document cards now own their styles locally
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
- Signing progress belongs in the document body's right-side rail so the top ruler, left ruler, paper canvas, and export geometry are never shifted by workflow UI; the rail is fixed to the visible canvas area and must not move when document content scrolls
- After a signer completes signing, the editor is made read-only immediately in memory without a page reload
- Signed, finalised, and locked editor immutability is centralized in `src/lib/document-readonly.ts` with regression coverage so future editor changes cannot accidentally re-enable editing
- Owner lock is a confirmed action, not an accidental one-click mutation
- Signed and locked documents render signing evidence in editor and print preview, with QR verification centered at the bottom of the signed page surface
- Print preview now uses the stable Gracon-owned canvas/export fallback; third-party runtime pagination has been removed while Gracon-owned pagination is implemented
- Print preview owns a cleanup audit for hidden paginated export roots: temporary export hosts, readiness timers, and DOM refs must be cleared when saving finishes or the preview unmounts
- Gracon-owned page break and pagination architecture is documented in `docs/gracon-owned-pagination-architecture.md`
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
                            shared editor loading state lives here
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
  hooks/useDocumentTitle.ts client-side route title helper for protected pages
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

## Recent Production Notes

- The default app workspace background is intentionally a soft off-white to reduce glare. Do not reintroduce the old purple radial/grid page background on documents, templates, login, or protected loading screens. Actual document paper and export/print surfaces should remain white for fidelity.
- Keep route titles explicit. Documents list should be `Documents | Gracon 360`, templates should be `Templates | Gracon 360`, and the editor should use the loaded document title.
- Prefer `DocumentLoadingState` for editor/document loading surfaces instead of creating new ad hoc spinners. Give each usage clear context-specific `message` and `detail` text.
- Keep risky renderers behind surface-level error boundaries. The live editor and print preview must recover independently and should remount only the failed surface.
- Prefer scoped CSS modules for route/component-specific styling. `globals.css` should be reserved for design tokens, shared primitives, app shell rules, editor document geometry, and truly global utilities.
- Document cards are styled through `DocumentCard.module.css`; do not add new `doc-card` globals.
- Signing progress is styled through `DocumentSigningProgressPanel.module.css`; keep it independent from document canvas geometry.
- Pagination must remain Gracon-owned in the live editor. Third-party pagination can be studied or temporarily isolated in preview paths only, but must not own live editing behavior.
- Hidden print-preview/export renderers must be treated as short-lived resources. Any new async render path must cancel timers, ignore callbacks after unmount, remove temporary DOM hosts, and keep object refs from pointing at detached nodes.

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
AUTH_COOKIE_DOMAIN=
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAME_SITE=lax
AUTH_ACCESS_TOKEN_TTL=15m
AUTH_REFRESH_TOKEN_TTL=1d
AUTH_REFRESH_ROTATION=true
AUTH_REUSE_DETECTION=true
DOCUMENTS_USE_MAIN_APP_LOGIN=false
ALLOW_DEV_READABLE_AUTH_COOKIES=true
NEXT_PUBLIC_DOCUMENTS_USE_MAIN_APP_LOGIN=false
NEXT_PUBLIC_ALLOW_DEV_READABLE_AUTH_COOKIES=true
```

Editor image storage variables belong in `api/documents`, not this frontend app. Do not expose storage credentials with `NEXT_PUBLIC_`.
For production, the auth cookie domain should be the parent domain, for example
`.gracon360.com`, so `app.gracon360.com` login can be reused by
`documents.gracon360.com`. Real session credentials should be `HttpOnly` and
validated server-side; `session_active` is only a non-sensitive hint.
Keep `DOCUMENTS_USE_MAIN_APP_LOGIN=false` and readable development cookies
enabled locally. In production, enable main-app login, disable readable auth
cookies, and let the server route handlers own shared cookie validation.

## Integration Boundaries

- Talks directly to `api/documents`
- Uses local proxy routes for auth/session recovery and signature endpoints
- Uses local `/api/session` to validate the shared Gracon session server-side before loading protected document routes. Missing production sessions should redirect to `app/app` login, while the local documents login remains available for development compatibility.
- Uses local `/api/logout` to revoke the current refresh session when available and clear shared document-visible session cookies before handing off to `app/app`.
- Redirects to `app/app` for login and identity verification
- Should not host its own standalone identity-verification UI now

## Important Rules

- Use hard navigation when jumping to `app/app`
- Do not add new production code that requires reading refresh tokens from `document.cookie`. Shared auth must be validated through server-side route handlers.
- Keep the existing local development login/readable-cookie method available for developer workflows. Production should use `NEXT_PUBLIC_DOCUMENTS_USE_MAIN_APP_LOGIN=true` and server-owned cookies from `app/app`.
- Keep logout unified. Document UI should call `logoutFromDocuments()` so local documents cookies and the shared app session are both cleared.
- Keep document permissions and signing state separate in the UI
- Reflect the backend workflow correctly: finalise, sign, then owner lock
- Keep page layout data consistent across editor rendering and export
- Treat invitation review as a security-sensitive flow, not a simple share acceptance

## Contribution Checklist

- Verify permission behavior before changing document actions
- Keep editor changes isolated from auth behavior unless the flow truly crosses apps
- Keep `components/editor` and `components/documents` for `.tsx` UI components; put editor/document `.ts` hooks, extensions, sync helpers, and pure state helpers under `src/store/editor` or `src/store/documents`
- Test invitation, share, signing, and public verify flows after document-domain changes
- Keep signed/locked read-only tests current whenever document statuses, permissions, or editor view modes change
