# Folder Structure Rules

Purpose: define where document frontend files belong so editor, signing, invitations, and export features stay maintainable.

## Current Layout

```text
app/documents/
  agents/                    AI-agent project rules
  docs/                      architecture notes such as owned pagination plans
  src/
    app/
      (protected)/documents/  document list and editor routes
      (protected)/templates/  template route
      api/                   local auth/session/signature/profile-image proxy routes
      invitations/[token]/   invitation review and acceptance
      login/                 local development login compatibility route
      verify/                public authenticity page
    api/                     typed browser clients for document APIs
    components/
      editor/                editor UI components only
      documents/             document cards and document-specific UI
      pages/                 route-level page UI
      layout/                app layout components
      shared/                shared shell and helpers
      ui/                    reusable primitives
    constants/               static app constants
    lib/                     pure helpers, auth helpers, title hooks, server helpers
    store/
      editor/                editor hooks, extensions, sync helpers, non-React editor logic
      documents/             document-domain state helpers
    types/                   shared frontend types
  test/                      pure and integration-ish frontend tests
```

## Placement Rules

- Put `.tsx` editor UI in `src/components/editor/`.
- Put non-React editor commands, TipTap extensions, and sync helpers in `src/store/editor/` or `src/lib/tiptap/`.
- Put document cards and document-list UI in `src/components/documents/` or `src/components/pages/documents/`.
- Put invitation page UI in `src/components/pages/invitations/`.
- Put auth/session helpers in `src/lib/auth/`.
- Put pure layout/export/import helpers in `src/lib/` or `test/export` / `test/import` as appropriate.
- Put route-level local BFF/proxy handlers under `src/app/api/`.
- Keep page-specific styling in colocated `.module.css` files.

## New File Rules

- Do not add new global CSS for a single component.
- Do not place browser-only logic in server route files.
- Do not place auth/session side effects inside generic editor components.
- Do not move editor geometry code into unrelated UI components.
