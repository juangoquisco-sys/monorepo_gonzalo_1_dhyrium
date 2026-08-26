# Import Path and Alias Rules

Apply these rules whenever adding, moving, or refactoring TypeScript and React imports.

## Allowed alias

Keep a single source alias:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Do not add aliases for individual folders unless a concrete architectural need is documented. TypeScript, Vite, ESLint, tests, and the editor must resolve the alias consistently.

## Import selection

- Import external dependencies from their package name.
- Use `@/` for stable modules owned by another top-level area of `src`, such as shared components, hooks, services, stores, utilities, models, or global types.
- Keep `./` and `../` for files in the same folder or nearby within the same domain.
- Keep CSS and asset imports relative to their owning component or page.
- Prefer the path that identifies the symbol's real owner; do not create or consume barrel files to shorten imports.

```ts
import { useState, type ChangeEvent } from 'react';
import Button from '@/components/button/Button';
import { axiosInstance } from '@/services/axiosInstance';
import type { RootState } from '@/store/store.types';
import ProductCard from './ProductCard';
import type { Product } from '../types/product.types';
import './ProductList.css';
```

## Domain boundaries

Do not mechanically replace a cross-domain import with `@/pages/...`. An alias can make a path shorter without reducing coupling.

When one domain under `src/pages` imports another domain:

1. Classify the dependency as a contract, constant, utility, service, hook, reusable component, screen component, or internal CSS.
2. Import from a focused owner module, not from a screen's internal folders.
3. Move genuinely shared contracts to a neutral owner when the task scope permits it.
4. Do not consume screen components or internal CSS across domains.
5. Do not duplicate business rules merely to remove an import.

## Type imports and specifiers

- Use `import type` when every imported symbol is type-only.
- Use inline `type` when a module supplies both runtime values and types.
- Keep enums, constants, classes, and functions as runtime imports when used at runtime.
- Omit `.ts`, `.tsx`, and `.d` from module specifiers.
- Preserve required extensions for CSS, JSON, images, and other assets.
- Match the exact casing of the target file and simplify malformed paths such as `./../x` to `../x`.

## Configuration changes

If alias configuration must change, inspect all relevant resolvers before editing:

- `tsconfig.json` and `tsconfig.app.json`
- `vite.config.ts`
- ESLint configuration
- test-runner configuration
- editor or IDE TypeScript resolution

Do not change only one resolver.

## Validation

After changing aliases or import paths, run the narrowest relevant ESLint command, then:

```sh
npx tsc -b --pretty false
npx vite build
```

Run relevant tests when available. Confirm that no new unresolved-module errors, casing mismatches, duplicate imports, or runtime cycles were introduced.
