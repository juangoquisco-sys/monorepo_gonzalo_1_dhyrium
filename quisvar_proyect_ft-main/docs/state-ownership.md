# Frontend State Ownership

## Rule

TanStack React Query owns remote state. Redux owns global client state. Component or form state owns temporary interaction. The URL owns navigation state that must survive navigation, sharing, or reloads.

Each piece of state must have one authoritative owner. Do not store the same data in React Query, Redux, and local state at the same time.

## Ownership matrix

| State kind                  | Owner                                   | Examples                                                                                      |
| --------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| Remote or server state      | TanStack React Query                    | API data, cache, loading, errors, mutations, refetching, and invalidation                     |
| Global client state         | Redux                                   | Authenticated session and client-only state shared by unrelated modules                       |
| Global dialog orchestration | Global DialogStack (Zustand)            | Dialog identity, presence, stack order, close blocking, and focus return                      |
| Temporary interaction       | Local component, reducer, or form state | Selected tab, draft form, transient selection, and local-only filters                         |
| Navigation-persistent state | URL path or search parameters           | Page, filters, sorting, selected entity, or tabs that must survive navigation or reload       |
| Derived state               | Compute from its source                 | Counts, filtered views, labels, permissions, and presentation values derived from owned state |

## TanStack React Query

Use React Query for data whose source of truth is the backend.

- Fetch API data through module-owned query hooks.
- Keep loading, error, retry, freshness, and cache behavior in the query layer.
- Perform server mutations with mutation hooks and update or invalidate the relevant cache on success.
- Keep query keys and invalidation logic close to the module hooks that define the queries.
- Prefer stable key factories when a module has multiple related queries or parameter combinations.
- Include every request parameter that changes the result in the query key.
- Invalidate the narrowest key that restores correctness; avoid broad global invalidation without a reason.
- Apply Socket.IO updates to the relevant query cache or invalidate the affected query instead of mirroring remote lists in Redux.

Do not add new Redux slices or thunks whose purpose is fetching, caching, or synchronizing ordinary server collections.

## Global DialogStack

Use the global DialogStack through `src/utils/dialog.ts` for every new dialog or modal flow. Do not create new local `Dialog` roots, legacy `Modal` instances, modal subscriptions, or parallel coordination mechanisms.

The DialogStack owns only global UI orchestration: entry identity, presence, stacking, close blocking, and focus return. Form values, validation, drafts, mutations, and remote data remain owned by the rendered child components, form hooks, or React Query as appropriate.

Existing dialog implementations may remain during focused maintenance. Migrate them only when the task explicitly includes that migration; adding a new dialog flow inside a legacy module still uses the global DialogStack.

## Redux

Use Redux for client-owned state that must be shared across unrelated parts of the application and cannot be represented adequately by the URL or a module provider.

Appropriate examples include:

- Authenticated session identity and session lifecycle.
- Client-only application state needed by unrelated modules.
- A genuinely application-wide preference when another persistence mechanism is not the owner.

Redux is not the default destination for reusable state. Before adding a slice, verify that the state is client-owned, application-wide, and needed by unrelated modules.

Do not create global stores for lists, detail records, filters, loading flags, or errors that belong to one API-backed module.

## Local and form state

Use local state for interaction that belongs to one component tree or disappears when the workflow closes.

Examples include:

- Popover or sheet visibility.
- A temporary tab that does not need a shareable URL.
- Draft form values and validation state.
- Expanded rows, hover state, and transient selections.
- Filters that intentionally reset when leaving the screen.

A form may initialize a draft from query data because the editable draft has different ownership. After initialization, define synchronization deliberately: do not continuously overwrite user edits when the query refetches. After a successful save, update or invalidate the remote query.

Do not copy query data into local state merely to render, sort, filter, or map it. Compute derived presentation values with normal render logic or memoization when it is measurably useful.

## URL state

Use route parameters or search parameters when state should survive reloads, browser back/forward navigation, bookmarks, or link sharing.

Typical URL-owned state includes:

- Current page and page size.
- Search, filters, and sorting that define the visible result set.
- Selected entity or workspace context.
- Active section or tab when it represents meaningful navigation.

Parse and normalize URL values at the module boundary. Invalid or unavailable values must fall back safely without creating a second competing source of truth.

Do not mirror URL-owned state into Redux. Local controls may hold an input draft, but the applied navigation state remains in the URL.

## Prohibited patterns

- Copying React Query results into Redux to make them globally accessible.
- Copying query results into local state solely for rendering.
- Creating a global slice for a module-owned list or detail response.
- Managing the same loading or error state in both React Query and Redux.
- Using a constant query key while request parameters change the returned data.
- Invalidating unrelated queries because ownership and keys are unclear.
- Defining query keys independently across screens instead of using the module's query hooks or key factory.
- Keeping shareable pagination or filters only in component state when they must survive navigation.

## Legacy code

Existing Redux-managed server state may remain during focused maintenance. Do not expand that pattern in new functionality.

When substantially changing a legacy flow:

1. Identify the authoritative source for each state value.
2. Move API-backed data, loading, errors, and mutations to React Query.
3. Keep only true application-wide client state in Redux.
4. Move navigation-persistent values to the URL.
5. Keep temporary interaction local.
6. Remove duplicate synchronization only within the safely tested scope of the task.

Do not turn a focused bug fix into an unrelated global state migration.

## Review checklist

Before considering a frontend state change complete:

- Every state value has one authoritative owner.
- API data, cache, loading, errors, and mutations are owned by React Query.
- Redux contains only justified global client state.
- Dialog orchestration uses the global DialogStack while its form and data state retain their proper owners.
- Other temporary interaction and form drafts remain local.
- Shareable or reload-persistent navigation state lives in the URL.
- Query keys contain all inputs that affect the response.
- Mutation success updates or invalidates the correct module queries.
- Query results are not duplicated in Redux or local state without an explicit draft boundary.
- Tests cover important cache invalidation, navigation state, or state transitions where applicable.
