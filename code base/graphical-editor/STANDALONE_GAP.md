# Standalone Build Gap

Current `@graphical-editor/core` source still depends on app-level aliases and cannot be built as a fully isolated package without additional refactoring.

## Blocking aliases

- `@/entities/projects`
- `@/entities/select-object`
- `@/shared/graphical-editor`
- `@/shared/graphical-editor/model`

## Files that still use `@/*`

- `model/stores/types.ts`
- `model/stores/graphic-scheme.store.ts`
- `model/schema/pointer/selected-pointer-graphic-object.ts`
- `model/schema/pointer/pointer-graphic-object.ts`
- `model/schema/types.ts`
- `model/schema/selected-graphic-object-scheme.ts`
- `model/schema/graphic-object-scheme.ts`
- `model/schema/converters.ts`
- `lib/drag-drop-object/use-dnd.ts`
- `lib/drag-drop-object/types.ts`
- `lib/drag-drop-object/dnd.store.ts`

## Next step

Replace alias-based imports with package-local imports or explicit peer package imports, then add standalone build config (`vite.config.ts` and `tsconfig.json`) for this folder.
