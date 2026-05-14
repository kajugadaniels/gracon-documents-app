# Gracon-Owned Page Breaks and Pagination Architecture

This document defines how the Gracon 360 Documents app should implement page breaks, page surfaces, pagination, and long-document performance without depending on `tiptap-pagination-plus` or any other runtime pagination package.

The goal is to make the live editor feel like a professional document tool while keeping the TipTap document model stable, secure, fast, and exportable.

## Executive Decision

Gracon must own pagination.

TipTap owns rich-text editing and document JSON. Gracon owns page geometry, page break rendering, page chrome, pagination metadata, long-document measurement, export parity, and performance policy.

Automatic page boundaries must be derived layout state, not persisted document content. Manual page breaks are user-authored content and may be persisted as explicit TipTap nodes.

## Why We Should Not Use `tiptap-pagination-plus` in the Live Editor

The `tiptap-pagination-plus` package is useful as a reference, but it is not a safe dependency for Gracon live editing.

Observed and architectural risks:

- It performs DOM measurement and page-break injection inside the editor runtime.
- It owns layout decisions that should belong to Gracon document metadata.
- It can freeze the editor when measurement and ProseMirror updates trigger each other repeatedly.
- It is especially risky around complex content such as tables, images, signature blocks, and oversized rows.
- It makes export parity harder because pagination logic lives in third-party editor decorations instead of our shared layout pipeline.
- It can silently change behavior when the package updates.

The correct production direction is to study the package's approach, then build a Gracon-owned version with strict boundaries and test coverage.

## Current Gracon Context

The `app/documents` project already has strong foundations we must preserve:

- A single smooth TipTap editor surface through `RichTextEditor`.
- A continuous editor canvas through `PagedDocumentCanvas`.
- Persisted layout metadata in `document-layout.ts`.
- A4 geometry constants in `constants/document-paper`.
- Ruler-driven margin and paragraph layout controls.
- DOCX and PDF export helpers.
- Signature blocks and signing evidence.
- Read-only locking after signing.
- Print preview pagination experiments isolated from the live editor.
- Tests for export geometry, document boundaries, import layout, list styles, images, links, and signature blocks.

Pagination must be added to this system, not replace it.

## Ownership Boundaries

### TipTap Owns

- Editable rich-text document structure.
- Text, marks, paragraphs, headings, lists, tables, images, signature block nodes, links, comments anchors, and selection.
- Undo and redo.
- Copy and paste behavior.
- Manual page-break node insertion when the user explicitly asks for a page break.

### Gracon Owns

- Paper size and page geometry.
- Margins, header/footer offsets, page gaps, page labels, and page numbers.
- Automatic page plan calculation.
- Page backgrounds and page gap rendering.
- Manual page-break visual treatment.
- Table page splitting policy.
- Long-document measurement and caching.
- Export pagination for PDF and DOCX.
- Safety guards for oversized blocks.
- Performance thresholds for enabling pagination.

### Backend Owns

- Persisted document JSON.
- Persisted document metadata, including layout metadata.
- Signing state, access state, hash state, and lock state.

The backend should not persist automatic page boundaries. Automatic pages are viewport/export layout state and can change when margins, paper size, font rendering, or content changes.

## Data Model

### Persisted Document Content

Manual page breaks should be stored as explicit TipTap nodes:

```json
{
  "type": "graconPageBreak",
  "attrs": {
    "kind": "manual"
  }
}
```

Rules:

- Manual page breaks are part of the user's authored document.
- They must survive save, reload, copy, export, and import where possible.
- They must be undo-safe through TipTap commands.
- They must not store automatic page numbers or page offsets.

### Derived Pagination State

Automatic pagination should be stored only in client memory:

```ts
interface GraconPagePlan {
  version: number;
  pageSize: {
    width: number;
    height: number;
  };
  contentBox: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    width: number;
    height: number;
  };
  pages: GraconPagePlanPage[];
  warnings: GraconPaginationWarning[];
}

interface GraconPagePlanPage {
  pageNumber: number;
  top: number;
  height: number;
  contentTop: number;
  contentBottom: number;
  startBlockKey: string | null;
  endBlockKey: string | null;
  forcedByManualBreak: boolean;
}

interface GraconPaginationWarning {
  type: 'oversized-block' | 'oversized-table-row' | 'unmeasured-content';
  blockKey: string;
  message: string;
}
```

This state is recalculated from DOM measurements and layout metadata.

## Core Design

The live editor remains one TipTap instance. Gracon draws page surfaces around it.

```text
Document editor page
  Header
  Status banner
  Top ruler
  Body
    Left ruler
    Scrollable canvas
      Page surfaces layer    Gracon-owned
      TipTap editor layer    TipTap-owned
      Page-break widgets     Gracon-owned decorations
      Signature overlay      Gracon-owned
    Signing progress rail
```

Automatic pages are visual surfaces behind the editor content. They are not separate editors. They are not separate TipTap documents. They are not persisted nodes.

## Page Break Types

### Manual Page Breaks

Manual page breaks are explicit user actions.

Expected behavior:

- Insert through menu action and keyboard shortcut.
- Render as a clean page gap label.
- Force the next block to start on the next page in page planning.
- Export to PDF and DOCX as a hard page break.
- Survive reload.

Implementation target:

- `src/store/editor/gracon-page-break-extension.ts`
- `src/lib/gracon-page-break.ts`
- Tests under `test/editor` and `test/export`.

### Automatic Page Breaks

Automatic page breaks are layout-derived.

Expected behavior:

- Appear only when content crosses the page content height.
- Recalculate after content, layout, image load, table resize, font load, or zoom changes.
- Do not enter document JSON.
- Do not affect undo/redo.
- Do not dispatch TipTap transactions during measurement.

Implementation target:

- `src/store/editor/gracon-pagination-plugin.ts`
- `src/lib/gracon-pagination-plan.ts`
- `src/components/editor/GraconPageSurfaces.tsx`

## Measurement Strategy

Pagination must measure top-level document blocks, not every inline span.

Measure these block categories:

- Paragraphs
- Headings
- Bullet and ordered lists
- Tables
- Figures and images
- Signature blocks
- Manual page-break nodes

Use stable block keys. Preferred key order:

1. Existing node attrs if stable.
2. ProseMirror document position.
3. DOM index fallback.

Measurement must use DOM reads only:

- `getBoundingClientRect`
- `offsetTop`
- `offsetHeight`
- `ResizeObserver`
- `document.fonts.ready`

Measurement must not write to TipTap state inside the measurement cycle.

## Measurement Loop

Use this sequence:

1. TipTap update occurs.
2. Schedule pagination measurement with `requestAnimationFrame`.
3. Read editor DOM block positions.
4. Build a pure page plan using current document layout metadata.
5. Compare the new plan with the previous plan.
6. Update React pagination state only if the plan materially changed.
7. Render page surfaces and labels from React state.

Never do this:

```ts
measureDom();
editor.commands.setSomething();
measureDom();
editor.commands.setSomething();
```

That pattern can cause freezing.

## Table Pagination Strategy

Tables must be handled deliberately.

Phase 1:

- Keep tables editable as normal TipTap tables.
- Measure table rows separately.
- Prefer page breaks before a row when the row would cross the page content bottom.
- Do not split one row across pages.
- If a single row is taller than a page content box, keep it on one page and emit an oversized-row warning.

Phase 2:

- Repeat table headers visually on continued pages.
- Add export parity for repeated table headers.
- Add safer row group planning for very large tables.

Phase 3:

- Consider row splitting only if the product explicitly requires it.
- Row splitting must be Gracon-owned and heavily tested. It should not mutate the live TipTap table while the user edits.

## Long-Document Performance Policy

Pagination should improve long-document performance by limiting expensive work, not by creating many TipTap editors.

Required rules:

- Keep one TipTap editor.
- Cache measured block heights.
- Re-measure only dirty blocks where possible.
- Defer below-viewport measurement with idle work.
- Virtualize page chrome, not editor content, in the first version.
- Do not render hundreds of page labels, shadows, or overlays if they are far outside the viewport.
- Do not run full pagination on every keystroke synchronously.

Suggested thresholds:

- Enable page chrome when content height exceeds one page.
- Enable long-document optimized measurement when content exceeds 3 pages or 150 top-level blocks.
- Enable virtual page chrome when content exceeds 15 pages.

These thresholds should be tuned after profiling real documents.

## Security Rules

Pagination is visual layout logic, but it still touches document content and export.

Rules:

- Do not use `dangerouslySetInnerHTML` for page labels or user-authored page text.
- Header and footer strings must be escaped before export HTML rendering.
- Manual page-break attrs must be schema-limited.
- Do not store raw DOM HTML in document JSON.
- Do not allow page-break nodes to carry arbitrary style or scriptable attrs.
- Export must use sanitized document content and existing safe URL/image helpers.
- Signature evidence and QR verification must remain controlled by signing state, not page layout state.

## Accessibility Rules

Manual page breaks should be understandable to assistive technology.

Required behavior:

- Manual page-break widget has an accessible label such as "Page break".
- Automatic page surfaces should be `aria-hidden`.
- Page labels should not spam screen readers during editing.
- Keyboard navigation must remain TipTap-native.
- Page break insertion must be undo-safe and keyboard accessible.

## Export Rules

Export must use the same page plan as preview.

PDF:

- Use Gracon page plan to capture pages.
- Use the same layout constants as the editor.
- Respect manual page breaks.
- Respect margins, header/footer toggles, and page numbers.
- Include signed signature evidence and QR verification placement.

DOCX:

- Convert manual page-break nodes to DOCX page breaks.
- Convert margins from shared layout helpers.
- Preserve table row/page policies where DOCX supports them.
- Do not persist automatic page boundaries unless DOCX requires an export-only break.

## Integration Points

Expected files or modules:

```text
src/store/editor/gracon-page-break-extension.ts
src/store/editor/gracon-pagination-plugin.ts
src/lib/gracon-pagination-plan.ts
src/lib/gracon-pagination-measurement.ts
src/lib/gracon-pagination-tables.ts
src/lib/gracon-page-break.ts
src/components/editor/GraconPageSurfaces.tsx
src/components/editor/GraconPageBreakWidget.tsx
src/components/editor/PagedDocumentCanvas.tsx
src/components/editor/RichTextEditor.tsx
src/components/editor/InsertMenu.tsx
src/components/editor/DocumentPrintPreviewDialog.tsx
src/lib/export-document-docx-dom.ts
src/lib/export-document-capture.ts
src/lib/export-pdf.ts or current PDF export path
test/editor/gracon-page-break.test.ts
test/editor/gracon-pagination-plan.test.ts
test/export/gracon-page-break-export.test.ts
test/export/gracon-pagination-export.test.ts
```

Use actual existing file names when implementing. Do not create duplicate systems if an existing helper already owns the concern.

## Implementation Plan

### Milestone 1: Remove Third-Party Pagination From the Live Path

Goal:

- Confirm `tiptap-pagination-plus` is not used in the live editor.
- Keep any remaining usage isolated to print preview only until Gracon preview pagination is ready.

Tasks:

- Audit imports for `tiptap-pagination-plus`.
- Document which code paths are experimental or temporary.
- Ensure live `PagedDocumentCanvas` uses the single TipTap editor path.

Exit criteria:

- Live editing does not load `PaginationPlus`.
- No runtime pagination package owns live page behavior.

### Milestone 2: Add Manual Page Break Schema

Goal:

- Add a safe, explicit page-break node.

Tasks:

- Create `GraconPageBreakExtension`.
- Add command `insertGraconPageBreak`.
- Add keyboard shortcut.
- Add parse/render rules.
- Add insert-menu item.
- Add tests for JSON shape and command behavior.

Exit criteria:

- Users can insert a manual page break.
- It saves and reloads.
- It does not break undo/redo.

### Milestone 3: Add Pure Pagination Geometry Helpers

Goal:

- Build page math without DOM or React.

Tasks:

- Create page content box helper.
- Map `DocumentLayout` to page geometry.
- Add pure page-plan helper that accepts measured blocks.
- Add tests for margins, headers, footers, page gaps, and manual page breaks.

Exit criteria:

- Page plans can be produced from fake block measurements in tests.

### Milestone 4: Add DOM Measurement Without State Mutation

Goal:

- Read block positions safely.

Tasks:

- Identify top-level block DOM selectors.
- Add measurement helper.
- Add `ResizeObserver` for the editor root.
- Add image-load and font-ready triggers.
- Debounce with `requestAnimationFrame`.
- Never dispatch editor commands during measurement.

Exit criteria:

- The app can measure block heights and generate a page plan without changing document JSON.

### Milestone 5: Render Page Surfaces

Goal:

- Make the editor visually paginated.

Tasks:

- Add `GraconPageSurfaces`.
- Render white pages and clean gray gaps behind TipTap content.
- Render page labels.
- Keep the existing top and left rulers fixed.
- Keep signing progress rail stable.

Exit criteria:

- Long documents visually show pages.
- Short documents remain smooth.
- Editor content remains one TipTap surface.

### Milestone 6: Manual Page Break Visuals

Goal:

- Make manual breaks look like preview page breaks.

Tasks:

- Add ProseMirror widget or node view for manual break.
- Label it clearly.
- Ensure selection and keyboard navigation stay smooth.
- Export the page break.

Exit criteria:

- Manual page break looks professional and behaves predictably.

### Milestone 7: Table Pagination Phase 1

Goal:

- Avoid ugly or broken table page splits.

Tasks:

- Measure table rows.
- Create page plan rules for row boundaries.
- Detect oversized rows.
- Add warning state for impossible splits.
- Keep live TipTap table unchanged.

Exit criteria:

- Tables move across pages by row where possible.
- Oversized rows do not freeze the editor.

### Milestone 8: Export Parity

Goal:

- Export what the user sees.

Tasks:

- Update PDF preview/export to use Gracon page plan.
- Update DOCX export to handle manual page breaks.
- Add export tests.
- Compare signed document QR/signature footer behavior.

Exit criteria:

- PDF output matches editor preview.
- DOCX handles manual page breaks.

### Milestone 9: Long-Document Optimization

Goal:

- Make large documents faster, not slower.

Tasks:

- Cache block measurements.
- Track dirty blocks.
- Virtualize page chrome.
- Add profiling helpers in development.
- Add performance tests or benchmark scripts for synthetic long docs.

Exit criteria:

- Large documents do not freeze on load or edit.
- Pagination recalculation is bounded and debounced.

### Milestone 10: Production Hardening

Goal:

- Make the system safe to ship.

Tasks:

- Test editing, paste, undo/redo, insert image, resize image, tables, signing, locking, comments, share, print preview, PDF export, DOCX export.
- Add regression tests for page plan changes.
- Add screenshots or Playwright checks for visual page gaps if the project test setup supports it.
- Remove unused third-party pagination dependency once no code path needs it.

Exit criteria:

- No live editor freezing.
- No export drift.
- No signing regression.
- No dependency ownership ambiguity.

## Tools Needed

Runtime tools:

- TipTap extensions and ProseMirror plugins.
- React state for derived page plan.
- `ResizeObserver`.
- `requestAnimationFrame`.
- `requestIdleCallback` with a safe fallback.
- `document.fonts.ready`.
- Existing Gracon layout helpers.

Testing tools:

- Node test runner already used in `app/documents`.
- Pure tests for page plan and geometry.
- Export tests for PDF/DOCX mapping.
- Optional Playwright visual checks for editor page gaps and fixed rulers.

Profiling tools:

- Browser Performance panel.
- React Profiler.
- Development-only timing logs behind a feature flag.
- Synthetic large-document fixtures.

## Production Readiness Checklist

- Manual page breaks are schema-backed.
- Automatic page breaks are derived only.
- Pagination does not mutate TipTap content.
- Measurement does not dispatch editor commands.
- Tables have explicit row policy.
- Oversized content has safe fallback.
- Export uses shared geometry.
- Short documents do not pay heavy pagination cost.
- Long documents measure incrementally.
- Rulers remain fixed and aligned.
- Signing progress rail remains fixed.
- Locked documents remain read-only.
- Signature evidence and QR verification render in editor and preview.
- PDF and DOCX export paths have regression tests.
- Third-party pagination package is removed after Gracon preview/export parity is complete.

## Final Target Behavior

For users, the editor should feel like this:

- Short documents open instantly as a normal smooth editor.
- Long documents show clean page surfaces and page labels.
- Page breaks look like the print preview.
- Tables continue across pages without ugly overlaps.
- Manual page breaks are predictable.
- Scrolling stays smooth.
- Rulers and signing workflow UI stay fixed.
- PDF output matches the editor preview.

For engineers, the system should behave like this:

- One TipTap document.
- One source of truth for layout metadata.
- One Gracon page plan.
- No third-party runtime ownership of pagination.
- No freezing measurement loops.
- Clear testable boundaries.
