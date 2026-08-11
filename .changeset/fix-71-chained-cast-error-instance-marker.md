---
"@deessejs/errors": patch
---

Replace the chained type assertion `(instance as unknown as Record<typeof FACTORY_SYMBOL, () => unknown>)[FACTORY_SYMBOL]` in `error.ts` with a single property assignment on the declared `ErrorInstance<T>` type. The `FACTORY_SYMBOL` is now declared on `ErrorInstance<T>` in `types.ts`; the marker assignment is type-checked, and the `as unknown` cast is gone. Closes #71. The package's public API is unchanged; all 83 tests pass.
