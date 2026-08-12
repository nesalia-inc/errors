---
"@deessejs/errors": minor
---

Implement Standard Schema type inference in `error()`. The `<const T extends Record<string, unknown>>` placeholder parameter is gone. The field shape is now derived from the `fields: StandardSchemaV1` parameter via a new `InferFields<S>` helper that uses `StandardSchemaV1.InferOutput<S> & Record<string, unknown>` to satisfy the `ErrorFactory<TFields>` constraint while preserving the precise inferred type at the call site.

Consumers passing a typed Standard Schema-compliant validator (Zod, Valibot, ArkType, etc.) now receive a factory whose return type carries the schema's output shape — no more `error<T>(...)` boilerplate. The trailing cast `return ErrorFactoryInstance as ErrorFactory<T>` is preserved (single cast, single boundary, rule 0008 compliant) but the gap it bridges is now narrower: the cast only widens at the metadata-attachment boundary, not at the type-parameter boundary.

Closes #83. The package's runtime behavior is unchanged; 85 tests pass (82 → 85, three new inference regression tests). The `ErrorConfig` type in `types.ts` is updated to mirror the new public signature.