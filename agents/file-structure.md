# File Structure Rules

Purpose: keep document frontend files typed, scoped, and safe for long-term editor work.

## Required File Shape

- Every file must start with a short top-level comment explaining its purpose.
- Every exported function, component, hook, and public helper must have JSDoc explaining what it does, parameters, and return value.
- Use `const` by default. Use `let` only when reassignment is necessary.
- Do not use `any`; create interfaces, DTO types, or narrow generics.
- Delete dead code instead of commenting it out.
- Keep one React component per file unless a small private child is only useful in that file.

## Naming

- React components: `PascalCase.tsx`
- CSS modules: `ComponentName.module.css` when matching an existing component style, otherwise `kebab-case.module.css`
- Helpers: `kebab-case.ts`
- Hooks: `useSomething.ts`
- Tests: `*.test.ts` or `*.spec.ts`

## Styling Rules

- Prefer scoped CSS modules for components, dialogs, cards, panels, and route surfaces.
- Keep `globals.css` limited to design tokens, shared primitives, document geometry, and truly global editor rules.
- Do not add inline style objects for complex UI.
- Use existing CSS variables and app design tokens.

## Component Rules

- Keep editor components focused on UI and command dispatch.
- Keep pure document transformation logic outside React components.
- Keep loading, error, empty, and locked states explicit.
