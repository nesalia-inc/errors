# 0004 — No Speculative Defences

**Status**: Active (enforced through code review).
**Date**: 2026-08-11.

## Rule

A runtime guard exists to handle one of two cases:

- A **demonstrated** runtime scenario where the value can fall outside
  the type system's narrowing (cross-realm objects, host-provided
  values, third-party APIs that lie about their types).
- A **demonstrated** production failure where the code was wrong
  about its preconditions.

If neither has happened, the guard does not belong in the code. A
`typeof x === 'object' && x !== null` after the compiler has already
narrowed `x` to non-null is not a defence. It is a wall the next
contributor has to climb while they figure out which scenario the
author was worried about.

## Why

Speculative defences grow like moss:

- A guard against a scenario that never occurred encourages the next
  contributor to add a guard against their own scenario.
- Each guard is a tax on every reader: they have to determine whether
  the case is real before they can trust the code path that follows.
- Guards of equal status cover both real and imaginary cases, so the
  reader cannot tell which is which.

A senior codebase carries **only the defences that have paid for
themselves**. A defence has paid for itself when the scenario it
covers has either:

- Been observed in production and traced back to the absence of the
  guard.
- Been identified by a static analyser or fuzz test as reachable.

If neither, the guard is a tax on everyone and a benefit to no one.

## The pattern this rule catches

The rule is not against being defensive. It is against defending
against cases that have not been demonstrated. The distinguishing
shapes:

- **Real**: `if (typeof x === 'function')` after the type system
  declared `x: () => void`. The compiler already proved it; the
  guard is redundant.
- **Real**: `if (typeof err === 'object' && err !== null)` before
  reading `err.message`, when `err: unknown` and the caller might
  pass null. The compiler excluded the case but the input contract
  permits it.
- **Not real**: the same `if (typeof err === 'object' && err !== null)`
  re-applied two statements after a narrowing branch that already
  proved non-null. The compiler still has the narrowing, but the
  author lost confidence in their own code and wrote the check
  twice.

The first two are real defences against real contracts. The third is
the smell this rule exists to catch.

## What to do instead

When you find yourself about to write a runtime check, ask four
questions in order. Any "no" answers the question of whether the
guard belongs.

1. **What is the input contract?** Be able to state the precondition
   on which the function relies. "The caller passes either an
   `ErrorFactory` or a native error class" is a contract. "Anything"
   is not.
2. **Is the contract expressible in the type system?** If yes,
   express it. `err: object` excludes null. `err: unknown` does not.
   A narrower input type is a defence the compiler provides for
   free.
3. **Is the runtime check covering a case the type system cannot
   rule out?** If yes, keep the guard and add a comment that names
   the scenario (cross-realm `instanceof`, JSON-parsed foreign
   values, host-provided callbacks, etc.). A guard without a named
   scenario is the smell.
4. **Has this scenario actually occurred?** If no, do not encode
   the guard. Wait for the bug report, the fuzz output, or the
   static analyser warning. Until then, the code path is the
   cleanest expression of the contract you actually have.

**Bad** — guard without a named scenario, swallowing the failure:

```ts
function discriminate(
  err: unknown,
  type: ErrorFactory | (new (...args: unknown[]) => Error)
): boolean {
  // Pre-existing narrowing was already in place above this point.
  if (typeof err === 'object' && err !== null) {
    // Redefence of a narrowing the compiler already proved.
  }

  // The code below this comment never sees a cross-realm object.
  // The catch is a tax paid by every reader.
  try {
    return err instanceof type;
  } catch {
    // "instanceof can fail for cross-realm errors" — but they never arrive here.
  }
  // ...
}
```

**Good** — trust the narrowing; if the cross-realm scenario ever
appears, add the guard with a comment that references the bug:

```ts
function discriminate(
  err: unknown,
  type: ErrorFactory | (new (...args: unknown[]) => Error)
): boolean {
  if (typeof type === 'function' && 'prototype' in type) {
    // No try/catch. instanceof against a class never throws on its own
    // in the contexts this function is called from. If a cross-realm
    // scenario is reported, add the guard with the bug number.
    return err instanceof type;
  }
  // ...
}
```

## What this looks like in violation

A function declared with `err: unknown` that, three statements later,
re-checks `typeof err === 'object' && err !== null` even though a
prior branch already returned on `err == null`. The author was not
sure the narrowing survived the intervening statements. The right
move is to trust the narrowing (the compiler tracks it across the
whole function), or to restructure the function so the narrowing
happens once at the top.

A second smell: a guard inside a `try { ... } catch { /* swallow */ }`
that hides an exception which the surrounding code could not
conceivably throw. The catch is there "in case". It is not a defence;
it is a lie about what can fail.

## Enforcement

- **Code review**. A reviewer who sees a runtime check whose comment
  reads "just in case", "to be safe", or is empty, blocks the PR
  and asks for a named scenario.
- **Self-audit during refactor**. When touching a function for any
  reason, list every runtime guard inside it. For each, ask: what
  scenario does this cover, and has it occurred? If the answer to
  the second is no, remove the guard and the corresponding
  impossible branch.
- **Bug-driven addition only**. When a production incident reveals
  a missing guard, the guard is added **with the bug report
  number** in a comment that explains the scenario in one sentence.
  The guard and the report form a closed loop.

## Exceptions

A documented, scenario-named guard against an input that crosses a
trust boundary is legitimate: deserialised JSON, foreign realms,
host-supplied callbacks, third-party APIs that lie about their types.
These guards must carry a comment that names the scenario and the
reason the type system cannot rule it out. A guard without that
comment is the smell, not the exception.
