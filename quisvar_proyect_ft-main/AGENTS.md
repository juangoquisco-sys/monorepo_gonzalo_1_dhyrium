# Frontend Guidelines

## Project Structure

This is a Vite React TypeScript app. Source code lives in `src/`:

- `components/`: shared UI components.
- `pages/`: feature and route-level screens.
- `hooks/`: reusable React hooks.
- `services/`: API clients and domain services.
- `store/`: Redux state and thunks.
- `routes/`: route configuration.
- `utils/`: shared helpers.
- `styles/`: global and shared styles.

Public assets, templates, fonts, tutorials, and images live in `public/`. Playwright specs live in `tests/e2e/`.

Run frontend commands from `quisvar_proyect_ft/`, not the repository root.

## Commands

- `npm run dev`: start Vite.
- `npm run build`: type-check and build production assets.
- `npm run preview`: preview the production build.
- `npm run lint`: lint `src/`.
- `npm run test:e2e`: run Playwright specs.

## Coding Style

Use TypeScript and follow the existing project conventions:

- React components in PascalCase, for example `UserDetail.tsx`.
- Hooks as `useName.tsx`.
- Domain API calls in focused service files under the relevant module or `src/services/`.
- Keep module CSS beside its component or page when the module already follows that style.

Prefer small, domain-focused functions and avoid broad abstractions unless they remove real duplication.

## Frontend Rules

- Do not change global styles unless explicitly requested.
- Do not introduce new dependencies without justification.
- Keep API services/hooks aligned with backend contracts.
- Prefer module-owned services/hooks over global stores.
- Do not hardcode backend business rules in UI code.
- Follow the import-path convention in `docs/path-aliases.md`; keep `@/* -> src/*` as the only source alias.

## UI Development

- Build all new screens, features, and reusable UI components with the current design system. Follow `docs/design-system-shadcn.md`.
- Prefer existing components from `src/components/app-ui`; use Shadcn primitives from `src/components/ui` only when no suitable application wrapper exists.
- Use the global DialogStack through `src/utils/dialog.ts` for every new dialog or modal flow; do not introduce local dialogs, legacy modals, or parallel coordination.
- Keep existing dialog implementations during focused maintenance; migrate them only when explicitly requested. See `docs/design-system-shadcn.md` and `docs/state-ownership.md`.
- Use Tailwind CSS and design-system tokens. Do not introduce new legacy UI patterns, arbitrary colors, duplicated styling utilities, or additional styling frameworks.
- Keep legacy styling for focused maintenance and bug fixes. Migrate the affected area when implementing a substantial redesign or new workflow, but do not migrate unrelated legacy code.
- Document any necessary exception in the implementation or pull request.

## State Ownership

- Use TanStack React Query for remote state, Redux for global client state, local state for temporary interaction, and the URL for navigation-persistent state.
- Do not copy query results into Redux or create global stores for module-owned lists. Keep query keys and invalidation in module-owned hooks; see `docs/state-ownership.md`.

## User lookups

Do not reintroduce a global frontend user list.

Do not use `GET /users` for module selectors or filters.

Forbidden frontend patterns:

- `state.listUsers`
- `useListUsers`
- `getListUsers`
- `setListUser`
- generic `listUsers` store slices

Use contextual backend-backed lookup services/hooks.

Remote/presencial eligibility must come from the backend. Frontend filtering is allowed only as an extra UX guard.

Before changing user selectors, read:

- `../docs/agent-rules/user-lookups.md`

## Testing

For frontend changes, run the narrowest useful verification first, then `npm run build` when the change touches TypeScript, routes, shared hooks, or services.

Use Playwright specs under `tests/e2e/` for end-to-end workflows and name specs by workflow, for example `gate-control.spec.ts`.

## Agent-Generated Local Artifacts

When a request needs a local-only helper, Docker convenience file, migration aid, setup script, or operational guide, place it in `.agent-local/` or name it `agent-local-*`. These paths are ignored by Git and must not be staged or committed.

Do not create root-level operational scripts or guides for the repository unless the user explicitly requests that they be versioned. Commit only product changes: functional source code, new modules, tests, and the configuration changes required for those product changes.
