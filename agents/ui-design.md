# UI And Design Rules

Purpose: keep the documents workspace professional, clear, and consistent across pages.

## Workspace

- Documents, templates, login, and protected loading backgrounds should stay soft off-white, not purple radial/grid backgrounds.
- Document paper and export/print surfaces should remain white for fidelity.
- The editor canvas owns the neutral gray workspace.
- Do not use visible helper text to explain obvious editor controls.

## Loading And Recovery

- Use `DocumentLoadingState` for document/editor/preview/protected loading.
- Give loading states context-specific `message` and `detail`.
- Keep editor and print preview behind scoped recovery boundaries.
- Malformed imported content should not crash the whole app.

## Components And CSS

- Prefer scoped CSS modules for route/component-specific surfaces.
- Keep signing progress, comments, document cards, print preview, templates, and protected shell styles local.
- Do not add new document card, comment drawer, or print preview styles to `globals.css`.

## Responsive Rules

- Support mobile, tablet, laptop, and desktop.
- Avoid horizontal page scrolling except for intentional document canvas behavior.
- Modals should adapt cleanly on mobile.
- Keep toolbar controls compact and readable.
- Text must not overflow buttons, cards, sidebars, or dialogs.

## Interaction Rules

- Use tooltips for icon-only or unfamiliar editor actions.
- Keep destructive actions confirmed.
- Keep signed/locked states visually obvious and non-editable.
