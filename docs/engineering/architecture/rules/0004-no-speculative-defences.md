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

When you find yourself about to write a runtime check, ask five
questions in order. The first is the reframe; the next four are the
checklist. Any "no" answers the question of whether the guard
belongs.

0. **Why is this value nullable at all?** A guard against null is
   a question: "why was this value allowed to be null in the first
   place?" If the answer is "it shouldn't be", the type is wrong;
   fix the type. If the answer is "it can be, by design", the
   guard is legitimate. If the answer is "I don't know", the guard
   is a superstition. The reframe is the gate: a guard whose
   origin cannot be named is a guard that does not belong.

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

## What senior practitioners say

The rule is not a stylistic preference. Four sources capture the
consensus that operationalises it:

> "Experienced developers don't eliminate null checks entirely —
> they reduce the need for them by designing stronger contracts
> and clearer domain boundaries. Instead of constantly defending
> your methods with 'Could this be null?', the architectural
> question should be: 'Why was this object allowed to enter the
> system as null in the first place?'"
>
> — Aziz Kale, _Why Senior Developers Rarely Need `if (x == null)`_,
> Dev Genius, July 2026.

Kale's reframe is the first question this rule asks. The author
of a guard is not the author of a safety net; they are the author
of a question. If the question has no answer, the guard has no
purpose.

> "If the type says it's not null, trust the type. If the type
> is wrong, fix the type. Don't add runtime null checks for values
> that can't be null."
>
> — Miguel Pizza, _No Defensive Null Checks_, Maintainable
> TypeScript doctrine.

Pizza's formulation is the operational form of the rule. A guard
on a non-nullable type is not a defence; it is a signal that the
type is wrong. The fix is in the type, not in the runtime.

> "If you find yourself constantly writing repeating code to
> perform some validations, it's a strong sign you fall into the
> trap of primitive obsession."
>
> — Vladimir Khorikov, _Defensive programming: the good, the bad
> and the ugly_, Enterprise Craftsmanship.

Khorikov's point is the smell of repetition. A guard that appears
in five methods is not five guards; it is one domain invariant
expressed five times in five places. The right shape is a type
that owns the invariant once.

> "I took out as much of this 'protection' as I could safely
> remove, and cleaned up the error handling so that I could
> actually maintain the system without losing what was left of my
> mind. I setup trust boundaries for the code [...] deciding what
> data couldn't be trusted and what could."
>
> — Jim Bird, _Defensive Programming: Being Just-Enough Paranoid_,
> Building Real Software, March 2012.

Bird's anecdote is the cautionary tale. A system saturated with
guards becomes unmaintainable. The fix is not more guards; the
fix is trust boundaries. Decide what is outside (untrusted) and
what is inside (trusted); the defences live at the boundary, not
throughout the body.

The four sources converge on the same operational rule: guards
belong at the boundary between trusted and untrusted; inside
the trust boundary, the type system is the defence. This rule is
the operational form of that position.

## See also

- **Rule 0007** — Top-Down Composition: a function that accumulates
  guards is a function that has grown past its name. The
  reframe in question 0 often reveals that the function's
  responsibility should be split, not defended.
- **Rule 0008** — No Chained Type Assertions: the type-side
  complement. A guard at a boundary without a cast is this rule's
  smell; a chain of casts is 0008's smell. The two rules compound:
  one is the runtime discipline, the other the type discipline,
  and both ask the same question — "what is the contract?".
