# Editor List Style Audit

This note captures the current list implementation before adding selectable
bullet and numbering styles.

## Current Implementation

- `RichTextEditor` registers `StarterKit` with the default list extensions. It
  does not currently configure custom `bulletList`, `orderedList`, or `listItem`
  attributes.
- `DocEditorToolbar` exposes one bullet-list button and one numbered-list
  button. They call TipTap's default `toggleBulletList()` and
  `toggleOrderedList()` commands.
- The legacy inline toolbar inside `RichTextEditor` uses the same default list
  toggles when the external toolbar is hidden.
- Indentation is handled through TipTap's default `sinkListItem('listItem')`
  and `liftListItem('listItem')` commands.

## Persistence Gap

List style is not schema-backed today. Saved editor JSON can identify whether a
list is a `bulletList` or an `orderedList`, but it has no attribute for the
specific marker style, such as `disc`, `lower-alpha`, or `upper-roman`.

That means a CSS-only implementation would be fragile: the selected style would
not reliably survive autosave, reload, import, export, or future editor
transformations.

## Export And Import Gap

- DOCX DOM export currently distinguishes only `OL` versus `UL` and maps those
  to shared `ordered-list` and `bullet-list` numbering references.
- There is no current mapping from editor list style metadata to DOCX numbering
  formats.
- DOCX import currently has no list-style conversion path back into editor JSON.

## Recommended Direction

The next implementation milestones should add list style as controlled node
attributes on TipTap list nodes, then route toolbar actions, editor rendering,
and import/export conversion through the same typed list-style contract.
