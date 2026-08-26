# Frontend Design System

## Purpose and scope

This document defines the visual and composition rules for the entire Quisvar frontend. Shadcn UI, Radix, and Tailwind CSS provide the system infrastructure; product identity comes from its tokens, application components, and operational patterns.

This guide applies to:

- New screens and workflows.
- New reusable components.
- Legacy areas receiving a substantial redesign or a new workflow.
- Planned visual migrations.

Module-specific decisions must live in that module's documentation and must not be treated as cross-application rules until they have proven reusable.

## Sources of truth

- Shadcn configuration: `components.json`.
- Tokens, themes, and legacy compatibility: `src/index.css`.
- Available primitives: `src/components/ui`.
- Components that encode application-level policy: `src/components/app-ui`.
- Shared table controls: `src/components/data-table`.
- Domain-specific components: within the module that consumes them.

The code directories are the source of truth for the component inventory. If this guide conflicts with the current implementation, update the guide in the same change that establishes the new pattern.

## Visual direction

Quisvar is an operational application. The interface should feel clear, reliable, and efficient, with enough density to support real work without turning every screen into a generic dashboard.

- Prioritize information and actions over decoration.
- Keep primary information visible in the first viewport when the workflow allows it.
- Place actions near the content they create or modify.
- Use typography, spacing, and contrast before adding containers.
- Reserve strong color for meaningful actions, states, and signals.
- Avoid visual noise, repeated strong borders, decorative shadows, and competing colors.
- Avoid cards inside cards and containers without a clear responsibility.
- Design each structure around the module's actual work; do not impose the same dashboard on every screen.

## New development and legacy code

- Build every new screen, feature, and reusable component with the current design system.
- Use Tailwind CSS and design-system tokens for new styles.
- Do not introduce new uses of legacy components, styles, or patterns.
- Preserve the legacy implementation for focused maintenance and bug fixes.
- Build new functionality inside a legacy screen with the current system whenever it can be integrated without a disproportionate rewrite.
- Migrate the affected area when a change is a substantial redesign or adds a new workflow.
- Do not expand a task to migrate unrelated legacy code.
- Justify any exception in the implementation or pull request.

## Component hierarchy

Choose components in this order:

1. Reuse a component from `src/components/app-ui` when it covers the use case.
2. Use a primitive from `src/components/ui` when no suitable wrapper exists.
3. For TanStack tables, compose the screen with controls from `src/components/data-table`.
4. Create a module-owned component when it represents domain-specific behavior or language.
5. Promote a pattern to `app-ui` only when it repeats and centralizes a stable appearance, semantics, accessibility, or behavior decision.

Do not create wrappers that merely rename or re-export a primitive without adding stable policy. Import each component from its owning module; do not create or consume barrel files.

## Current inventory

Primitives in `src/components/ui`:

- `alert`
- `avatar`
- `badge`
- `button`
- `calendar`
- `card`
- `checkbox`
- `context-menu`
- `dialog`
- `dropdown-menu`
- `input`
- `label`
- `popover`
- `scroll-area`
- `select`
- `separator`
- `sheet`
- `table`
- `tabs`
- `textarea`
- `tooltip`

Components in `src/components/app-ui`:

- `AppBadge`
- `AppButton`
- `AppInput`
- `AppPageShell`
- `AppSelect`
- `AppTable` and its subcomponents
- `JsonViewer`

Controls in `src/components/data-table`:

- `DataTableColumnHeader`
- `DataTableDateRangeFilter`
- `DataTableEmptyState`
- `DataTableFacetedFilter`
- `DataTableLoadingRows`
- `DataTableViewOptions`

Always inspect these directories before assuming that a component is missing.

## Tokens and themes

Official tokens live in `src/index.css`. Use the semantic classes Tailwind exposes from these tokens.

### Surfaces and text

- `background` and `foreground`
- `card` and `card-foreground`
- `popover` and `popover-foreground`
- `primary` and `primary-foreground`
- `secondary` and `secondary-foreground`
- `muted` and `muted-foreground`
- `accent` and `accent-foreground`
- `border`, `input`, and `ring`
- `destructive` and `destructive-foreground`

### Semantic states

- `success`, `success-foreground`, and `success-muted`
- `warning`, `warning-foreground`, and `warning-muted`
- `info`, `info-foreground`, and `info-muted`
- `danger`, `danger-foreground`, and `danger-muted`
- `review`, `review-foreground`, and `review-muted`

Use states according to meaning, not color preference. Never rely on color alone to communicate a state.

### Data, navigation, and structure

- `chart-1` through `chart-5` for data visualizations.
- `sidebar-*` tokens for side navigation.
- `radius-*` for consistent corner radii.
- `shadow-app-card` and `shadow-app-panel` for approved elevation.
- `app-space-page` and `app-space-section` for structural spacing.
- `z-*` tokens for layers, portals, navigation, modals, toasts, and global blockers.

The application supports light and dark themes through `ThemeProvider`. Always prefer classes such as `bg-background`, `text-foreground`, `text-muted-foreground`, and `border-border` over concrete scales such as `slate-*` or `gray-*`.

Concrete colors are allowed only for specialized content that does not yet have an appropriate token, such as a code viewer. Keep the exception local, legible in both themes, and review it if the pattern is reused.

Legacy `--color-*` variables exist for compatibility. Do not use them as the foundation for new components.

## Typography

- Main page title: `text-2xl` or `text-3xl`, `font-bold`, `tracking-tight`, and `text-foreground`.
- Section or card title: `text-base` or `text-sm`, `font-semibold`, and `text-foreground`.
- Body text: `text-sm`, `font-normal`, and either `text-foreground` or `text-muted-foreground` according to hierarchy.
- Metadata and compact labels: `text-xs` and `font-medium`; use uppercase and tracking only when they add structure.
- Dense table data: `text-xs` or `text-sm`, while preserving legibility and hierarchy.

Do not use `font-extrabold` or `font-black`. Do not invent module-specific type scales without a documented need.

## Application components

### AppButton

- Use `primary` for the main action in the current context.
- Use `secondary` or `outline` for alternative actions.
- Use `ghost` for low-emphasis actions.
- Use `danger` for destructive actions.
- Pair unclear icons with text; use an icon-only control only when it has an accessible name.

### AppInput

- Use for inputs that need a consistent label, helper text, or error.
- Do not create labels and messages manually when `AppInput` covers the case.
- Use the `Textarea` primitive for multiline text. Create `AppTextarea` only when a repeated policy cannot be handled by the primitive.

### AppSelect

- Use for simple native selections backed by a data list.
- Use the `Select` primitive when a workflow needs composed content, richer interaction, or Radix behavior.
- Preserve the label, placeholder, disabled state, and accessible name.

### AppBadge

- Use semantic variants for consistent states: `success`, `warning`, `info`, `danger`, and `review`.
- Create a domain badge when mapping business state to text and iconography requires domain logic.

### AppTable

- Use for simple tables or to compose a table with consistent base styling.
- For sorting, filters, column visibility, loading, and empty states, use TanStack React Table with the shared controls in `src/components/data-table`.
- Keep columns and table state within each screen; do not create a generic abstraction that hides domain requirements.

### AppPageShell

- Use as the base surface for modernized pages that need the application's background and typography context.
- Internal structure depends on the workflow: add a header, toolbar, content area, contextual navigation, or secondary panel only when it supports that page's work.

### JsonViewer

- Use for request bodies, responses, parameters, and other structured technical data.
- Preserve the copy action, empty state, and an appropriate height limit.
- Do not use it for business information that deserves a user-friendly presentation.

## Layout and navigation

- Use `AppPageShell` or an equivalent surface as the root of a modernized screen.
- Keep the title, context, and primary action in a recognizable header.
- Use grid or flex with `minmax(0, 1fr)` and `min-w-0` when content may overflow.
- Avoid rigid `vw`- or `vh`-based dimensions when they can break responsive behavior.
- Use tabs to separate responsibilities within the same context, not as a replacement for routes or deep hierarchy.
- Use side panels for details, help, filters, or secondary actions; do not move the primary task there without a workflow reason.
- Keep global and contextual navigation visually distinct.

There is no universal two- or three-column layout. Each module should use the simplest structure that keeps its context, content, and actions visible.

## Forms

- Place a form near the content it creates or modifies.
- Prefer inline forms for primary, repeated tasks.
- Use the global DialogStack through `src/utils/dialog.ts` for every new confirmation or modal task that requires focused attention. Do not instantiate a local `Dialog`, legacy `Modal`, or parallel modal coordinator.
- Use `Sheet` for details or secondary workflows that need more space and lateral context.
- Use `Popover` for compact, transient controls, not for long forms.
- Show labels, guidance, and errors next to the corresponding field.
- Disable saving when minimum data is missing and explain correctable errors.
- Keep the same verb for the action, loading state, and resulting confirmation.

## Tables, lists, and filters

- Use a table when comparison across columns is central to the task.
- Use a list or cards when each item has variable structure, contextual actions, or narrative reading.
- Keep headers, sorting, faceted filters, date ranges, column visibility, loading rows, and empty states consistent through the existing shared controls.
- Make active filters visible and provide a clear way to reset them.
- Keep bulk actions close to the selection that enables them.
- Allow controlled horizontal scrolling when a table cannot shrink without losing meaning.

## States and messages

Every data-driven screen must account for:

- Initial loading.
- Background refresh when relevant.
- Empty state.
- Recoverable error with a next action.
- Disabled or unauthorized state when applicable.

An empty state should explain what is missing and what the user can do next. An error should state what happened in useful language and how to retry or fix it. Use active voice, sentence case, and consistent action names throughout the workflow.

## Overlays and layers

- Use `DropdownMenu` or `ContextMenu` for compact groups of related actions.
- Use `Tooltip` as supplementary help; do not hide information required to complete a task.
- Use the existing `z-*` tokens. Do not introduce arbitrary z-index values without a justified exception.
- Verify that dialogs, sheets, popovers, menus, toasts, and loaders preserve the expected layer order.

## Responsive behavior

- Design the content hierarchy first, not a fixed desktop screenshot.
- Reduce columns progressively according to available space and the priority of each region.
- Allow horizontal scrolling in tabs and tables when it is more legible than compressing them.
- Collapse multi-column forms to one column at narrow widths.
- Prevent toolbars, actions, and filters from covering the main content.
- Verify wrapping for titles, badges, buttons, and long values.

## Accessibility and motion

- Use semantic elements: buttons for actions, links for navigation, and labels associated with fields.
- Provide an `aria-label` when a control has no visible text.
- Preserve visible focus and complete keyboard navigation.
- Do not rely only on color, position, or iconography to communicate information.
- Keep interactive targets usable on touch screens.
- Use motion only when it explains a state change or preserves spatial continuity.
- Respect `prefers-reduced-motion` and avoid repetitive decorative animation.

## Progressive migration

When modernizing a screen:

1. Identify the current workflow's responsibilities, states, and actions.
2. Preserve backend contracts, permissions, and behavior outside the visual scope.
3. Replace hardcoded colors and measurements with tokens.
4. Adopt `App*` components, primitives, and shared controls where appropriate.
5. Simplify the layout and correct overflow or rigid responsive behavior.
6. Standardize loading, empty, error, and disabled states.
7. Verify accessibility, light and dark themes, and narrow widths.
8. Run focused checks and `npm run build` when appropriate.

Do not remove legacy components used by other modules or perform global migrations as a side effect of one screen.

## New or modernized screen checklist

- Uses semantic tokens and works in light and dark themes.
- Reuses `App*` components, primitives, and shared controls where applicable.
- Does not introduce new legacy patterns.
- Has clear visual hierarchy without unnecessary containers.
- Keeps actions and forms close to their context.
- Covers loading, empty, error, and permission states when applicable.
- Works with keyboard navigation, visible focus, and accessible names.
- Adapts to desktop and narrow widths without overlap.
- Preserves backend contracts and domain rules.
- Focused checks, applicable lint, and the build pass.

## System governance

Update this guide when:

- A primitive is added to or removed from `src/components/ui`.
- A component in `src/components/app-ui` is created or changed.
- A cross-application pattern is established in at least two contexts.
- Tokens are added or theme behavior changes.
- A new table, form, navigation, state, or overlay pattern is adopted.
- A rule is found that prevents repeated visual regressions.

Keep decisions that apply to only one domain in that module's documentation. Promote them here only after they have proven reusable across the application.
