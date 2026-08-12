# 0001 — Standard Schema as the runtime validation contract

**Status**: Accepted
**Date**: 2026-08-12

## Context

`@deessejs/errors` accepts a `fields` parameter in `error()` that describes the structured shape of an error. Consumers want this shape to drive the `ErrorInstance<T>` generic — typing `err.fields.email` correctly without manual annotation. The shape is supplied by a runtime validator (Zod, Valibot, ArkType, etc.); the library cannot pick one validator without coupling a every consumer to its release cadence.

Three options were considered:

- **A. Pin a single validator (Zod).** Best DX for Zod users. Couples the package's release cadence to Zod's, and forces non-Zod consumers to either write an adapter or leave the typed type unwrapped.
- **B. Accept `unknown` and let consumers cast.** No runtime contract; every consumer writes the same cast at every call site.
- **C. Accept any Standard Schema-compliant validator.** The contract is the spec, not a vendor. Consumers keep their validator of choice; the library types the output via `StandardSchemaV1.InferOutput<S>`.

## Decision

Adopt **option C**. The `error()` function accepts `fields?: StandardSchemaV1` and infers the field shape through `StandardSchemaV1.InferOutput<S>`. Zod, Valibot, ArkType, and any future compliant validator work without code change.

The current implementation lands in PR #84 (issue #83). The relevant types:

- `InferFields<S>` in `packages/errors/src/error/types.ts` — extracts the field shape via `StandardSchemaV1.InferOutput<S>` and falls back to `Record<string, never>` when `fields` is omitted.
- `error()` in `packages/errors/src/error/error.ts` — generic over `S extends StandardSchemaV1 | undefined = undefined`; the return type is `ErrorFactory<InferFields<S>>`.
- `ErrorConfig<S>` mirrors the public signature for callers that type a config object separately.

## Consequences

**Easier:**

- Consumers keep their validator of choice. No adapter layer.
- The `fields` parameter is typed end-to-end: the factory accepts exactly the schema's output, the instance carries it, the `addNote` / `from` methods preserve it.
- New validators that adopt Standard Schema work without library changes.

**Harder:**

- The library now has a transitive dependency on the Standard Schema spec. If the spec changes shape, the library must follow. (Mitigation: the spec is at v1 with a stable `~standard` namespace; breaking changes would require a major version bump on our side too.)
- The `InferFields<S>` helper intersects with `Record<string, unknown>` to satisfy the `ErrorFactory<TFields>` constraint when a schema omits its `types` declaration. This widens the spec's `InferOutput<S>` (which would propagate `never` for untyped schemas) into a usable record. The widening is a documented deviation from the spec idiom; it can be revisited when `ErrorFactory`'s constraint is loosened.
- A bug in any validator's Standard Schema adapter (e.g. zod #5303 — `z.coerce` inference divergence in v4) propagates as a typing oddity in our generic. The library cannot fix the validator but can document known incompatibilities.

## Revisit conditions

This ADR should be revisited when:

- `@standard-schema/spec` ships a breaking change or is abandoned.
- A successor spec emerges (e.g. a v2 of the same name or a community fork) with adoption that makes migration worthwhile.
- A specific validator feature (e.g. recursive schemas with a unique syntax) becomes load-bearing for the library's surface area and cannot be exposed generically.

## References

- `@standard-schema/spec` v1.1.0 — the contract consumed.
- `packages/errors/src/error/types.ts` — `InferFields<S>` definition.
- `packages/errors/src/error/error.ts` — `error()` generic.
- Issue #83 — initial design discussion.
- PR #84 — implementation.