# Backend Guidelines

## Project Structure

This is an Express API written in TypeScript with Prisma. Source code lives in `src/`:

- `controllers/`: HTTP request handlers.
- `routes/`: Express route definitions and middleware wiring.
- `services/`: business logic and Prisma queries.
- `middlewares/`: auth, validation, upload, audit, and request middleware.
- `socket/`: Socket.IO behavior.
- `utils/`: shared helpers, Prisma client access, error handling, mailer, file helpers, and audit utilities.
- `seeders/` and `scripts/`: operational scripts and data setup.
- `docs/`: Swagger/OpenAPI files and schema docs.

Shared TypeScript declarations live in `types/`. Prisma schema and manual SQL files live in `prisma/`. Tests live in `tests/`. Static/runtime resources live in `404_page/`, `public/`, `resource/`, and upload-related folders.

Run backend commands from `quisvar_proyect_bk/`, not the repository root.

## Architecture For New Work

Follow `docs/architecture/backend-architecture-standard.md` for every new flow.

- Create entirely new business capabilities as vertical modules under `src/modules/<kebab-case>/`.
- Keep changes to existing capabilities with their current owner unless the task explicitly includes a tested migration.
- Scale structure with actual complexity; do not add use cases, repositories, domain layers, or integrations folders by default.
- Do not create `index.ts` files or barrel exports. Import symbols directly from their owning files.

## Commands

- `npm run dev`: start the API with `nodemon`.
- `npm run start`: run Prisma generate/db push, then start `src/app.ts`.
- `npm run build`: compile TypeScript with `tsc`.
- `npm test`: run all backend Node test suites.
- `npm run lint`: run ESLint with zero warnings allowed.
- `npm run generate`: generate Prisma client.
- `npm run dbpush`: push Prisma schema changes to the database.
- `npm run dbpull`: introspect the database into Prisma schema.
- `npm run studio`: open Prisma Studio.
- `npm run seed`: run seeders.

Prefer targeted test scripts while iterating, for example `npm run test:user-filters`, then run `npm run build` before handing off backend TypeScript changes.

## Coding Style

Use TypeScript and follow the existing module naming:

- Name directories in `kebab-case`, files in `camelCase`, and classes in `PascalCase`.
- Services use `domain.services.ts`.
- Controllers use focused request handlers and should stay thin.
- Routes should only wire paths, middleware, and controller methods.
- Shared helpers belong in `src/utils/` only when multiple domains need them.
- Shared domain types belong in `types/` when they are consumed across modules.

Keep business rules in services or domain utilities, not in controllers. Keep Prisma access centralized in services or explicit data helpers so route handlers remain easy to read and test. Validate all inputs of new flows with Zod at the HTTP boundary.

Rely on Express 5 to forward rejected async handlers to the global error middleware. Do not add `catchAsync` wrappers or `try/catch` blocks whose only purpose is calling `next(error)`; keep explicit catches for cleanup, logging, error translation, and callback- or event-based async work.

## Prisma And Database Changes

The current workflow uses Prisma `db push`. Do not add new migration files unless the team explicitly changes that workflow.

When changing the Prisma schema:

1. Update `prisma/schema.prisma`.
2. Run `npm run generate`.
3. Run `npm run dbpush` only when the schema change should be applied to the configured local database.
4. Add or update focused tests when the change affects business rules.

Manual SQL files in `prisma/` are operational scripts. Do not edit or add them unless the task explicitly requires a manual database script.

## Tests

Backend tests use Node's built-in test runner with `ts-node/register`. Add focused `*.test.ts` files under `tests/`.

Prefer service/domain tests for business logic, filters, authorization, audit policy, and date/eligibility rules. Avoid tests that require a live database unless the existing module already uses that pattern.

Run the narrowest relevant script first, then `npm test` or `npm run build` when the touched area is shared or high risk.

## API And Service Boundaries

Prefer module-owned endpoints for module-specific behavior. Avoid making generic endpoints grow module-specific query parameters unless the rule is genuinely shared.

Return only the fields the frontend needs for the workflow. Use lightweight DTOs for filters, dropdowns, and logs. Use full payloads only for detail screens or administrative workflows.

Keep authorization and eligibility checks on the backend. The frontend can improve UX, but it should not be the only place enforcing role, user type, attendance, rotation, license, or permission rules.

Do not break existing API contracts without updating affected frontend code. Keep validation in DTOs/schemas where the repo already uses them. Business rules must live in backend services or domain logic, not only in frontend filters.

## Audit, Logs, And Sensitive Data

Use the existing audit utilities and sanitizers for audit log work. Do not log passwords, tokens, secrets, raw authorization headers, or sensitive personal data.

When adding errors or audit events, use stable module/severity names that match the existing audit mapping utilities.

## Files And Uploads

For upload/download flows, follow existing utilities in `src/utils/` and existing middleware patterns. Validate file type, size, path handling, and cleanup behavior in the service layer when the workflow creates temporary or generated files.

Do not commit generated uploads, local backups, `.env` files, database dumps, or machine-specific artifacts.

## Agent-Generated Local Artifacts

When a request needs a local-only helper, Docker convenience file, migration aid, setup script, or operational guide, place it in `.agent-local/` or name it `agent-local-*`. These paths are ignored by Git and must not be staged or committed.

Do not create root-level operational scripts or guides for the repository unless the user explicitly requests that they be versioned. Commit only product changes: functional source code, new modules, tests, and the configuration changes required for those product changes.

## User lookups

`GET /users` is administrative only.

Module-specific user selection must use contextual lookup endpoints.

Remote/presencial eligibility must be enforced by backend context rules.

Contextual lookup endpoints should return only the fields needed by the UI.

Before adding or changing user lookup endpoints, read:

- `../docs/agent-rules/user-lookups.md`
