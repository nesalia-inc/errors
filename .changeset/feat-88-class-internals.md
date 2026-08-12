---
"@deessejs/errors": minor
---

Move the `ErrorInstance` implementation to a private class (`ErrorInstanceImpl`) while keeping the function-based public API. The class extends `Error` so `instance instanceof Error` returns `true`; the prototype chain is restored via `Object.setPrototypeOf(this, new.target.prototype)`. The brand marker is set on the class property in the constructor — no post-hoc assignment, no cast at the call site, no helper function.

The class is not exported. Consumers see only the `ErrorInstance<T>` type alias from `types.ts`. The factory function `error()` is the only path that mints an instance. Rule 0014 (functions over classes for public API) is satisfied.

The runtime shape is identical to the previous implementation; the methods (`addNote`, `from`) are real class methods with proper `this` types. The brand is constructor-enforced. 85 tests pass (82 → 85, three new tests pin the runtime invariants).

Closes #88.