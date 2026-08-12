---
"@deessejs/errors": minor
---

Brand `ErrorInstance<TFields>` with a `unique symbol` so the type system can prove the value came from `error()`. The brand is set on every instance at construction time (the only assignment site in the codebase) and is declared `readonly` on the type — consumer code cannot assign the brand without an `as` escape hatch, and any duck-typed object that lacks the brand is refused by the compiler.

The brand is the operational form of rule 0004 (the type is the guard) and rule 0015 (domain types over primitives — the domain identity of an `ErrorInstance` is "produced by `@deessejs/errors`"). It unlocks the senior direction called out in #35: once `is()` returns a type predicate and the brand exists, consumers can narrow `unknown` to `ErrorInstance<T>` at the boundary and trust the type at every call site.

Public API unchanged at runtime. The brand is opaque: it does not appear in any consumer-facing JSDoc and is not exported as a value from `index.ts`. Three new tests pin the runtime invariant (two symbol-keyed properties on a factory instance, none on a native `Error`) and the compile-time rejection (a literal without the brand is refused at the type level). 85 tests pass.

Closes #86. Refs #35 (predicate is the precondition for the brand to be useful at the consumer side).