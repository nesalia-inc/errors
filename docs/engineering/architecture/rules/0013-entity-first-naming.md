# 0013 — Entity-First Naming: Refuse Bare `-er` Suffixes

**Status**: Active (enforced through code review).
**Date**: 2026-08-11.

## Rule

A class, type, or module name is **never** a bare job title. The
suffixes `Manager`, `Service`, `Handler`, `Controller`, `Helper`,
`Writer`, `Reader`, `Converter`, `Validator`, `Router`,
`Dispatcher`, `Observer`, `Listener`, `Sorter`, `Encoder`,
`Decoder`, and every other `-er` ending that names what the thing
**does for the caller** rather than what the thing **is** —
are refused as standalone names.

The rule is not against suffixes. The rule is against suffixes
as **the only content of a name**. A `CancelOrderHandler` is fine
because the name says what is being handled; a `Handler` is not
because the name says only that something is being handled, by
something, without specifying what.

Three patterns, in increasing order of severity:

- **Bare job title** (`Manager`, `Service`, `Handler`) — the
  worst smell. The class has no focal responsibility, and the
  suffix is the only content of the name. Refused.
- **Qualifier plus job title** (`CancelOrderHandler`,
  `UserCreationService`) — acceptable. The qualifier forces the
  focal responsibility; the suffix names the role. Kept.
- **Entity name** (`SortedApples`, `ValidatedPayload`,
  `CancellationRequest`) — the best shape. The name describes what
  the thing **is**, not what it does for the caller. Preferred.

The rule prefers the third shape. The second shape is permitted
when the first is not yet achievable (a refactor in progress).
The first shape is never permitted.

## Why

A bare job title is a confession that the author could not name
the thing they were building. The thing exists; the author wrote
it. But the name they gave it is the name of the **role the thing
plays in someone else's code**, not the name of the thing itself.
The author outsourced the naming to the caller.

This is the same anti-pattern as a function called `doStuff`,
applied at the type level. The reader who meets the type for the
first time cannot tell what it represents, only what it does for
the system that uses it. The reader has to read the callers to
recover the entity, when the name should have done that work.

The deeper problem is **diffusion of responsibility**. A class
named `Manager` is a class to which any method can be added
without breaking its name. A class named `OrderCancellationService`
is a class to which only order-cancellation methods can be added
without breaking its name. The first grows; the second stays
focal. The smell is not aesthetic; it is a measurement of how
much scope a class is allowed to absorb.

## What this looks like in violation

The first shape, bare job title:

```ts
// Bad — what does this manage?
class UserManager {
  createUser(input: CreateUserInput): User {
    /* ... */
  }
  updateUser(id: string, input: UpdateUserInput): User {
    /* ... */
  }
  deleteUser(id: string): void {
    /* ... */
  }
  authenticateUser(credentials: Credentials): Session {
    /* ... */
  }
  sendPasswordResetEmail(email: string): void {
    /* ... */
  }
  generateUserReport(filters: ReportFilters): Report {
    /* ... */
  }
  // ... and so on, indefinitely.
}
```

Six unrelated responsibilities under one name. The next contributor
who adds a method asks "where does it go?" and the answer is
"UserManager". The class grows until it is unmanageable.

The second shape, qualified job title, is the **right intermediate
shape** when the class genuinely does one thing:

```ts
// Acceptable — the qualifier says what is cancelled.
class OrderCancellationHandler {
  handle(command: CancelOrderCommand): CancellationResult {
    /* ... */
  }
}
```

One responsibility, named by what it operates on plus what it does.
The qualifier (`OrderCancellation`) is the focal name; the suffix
(`Handler`) is the role.

The third shape, entity name, is the **preferred shape**:

```ts
// Preferred — the name describes what the thing is.
class OrderCancellation {
  cancel(command: CancelOrderCommand): CancellationResult {
    /* ... */
  }
}

// Or, more idiomatic in functional code:
type OrderCancellation = (command: CancelOrderCommand) => CancellationResult;
```

The class is the **thing**; the method is the **operation on the
thing**. The reader does not need to know who is using it.

## When the rule does not apply

The rule applies to **shape names** — the name of a class, a type,
a module, a service handle. It does not apply to:

- **Variable names** that hold an instance briefly. `const
manager = new OrderCancellationHandler();` is acceptable; the
  variable is scoped to one expression and the type name carries
  the focal responsibility.
- **Test names**. `UserManagerTest` is acceptable as a test class
  name when the type under test is `UserManager`; the test name
  mirrors the type name. Refusing the test name would create a
  useless indirection.
- **Build-time tooling**. Generated code, vendor bindings, and
  frameworks where the shape is fixed by the other side.

## How to refactor a bare job title

When a contributor has written `Manager`, `Service`, or `Handler`
alone, the refactor has three steps, in order of preference:

1. **Qualify.** `Manager` → `OrderCancellationManager`. The name
   now says what is managed. This is the smallest change.
2. **Divide.** If the qualified name still does not fit — if
   `OrderCancellationManager` ends up with methods that do not
   cancel orders — the class does not have a focal
   responsibility. Split it.
3. **Rename to entity.** If the class is the thing it operates
   on (it is the cancellation, the validation, the sort), rename
   it to the entity. `OrderCancellationHandler` → `OrderCancellation`.

The first step is the cheapest. The third is the right answer
when the first and second are not achievable.

## What this looks like in violation — the focused case

A class that has the right name but the wrong shape:

```ts
// Bad — the name says one thing, the methods do many.
class OrderCancellation {
  cancel(command: CancelOrderCommand): CancellationResult {
    /* ... */
  }
  refund(orderId: string, amount: Money): RefundResult {
    /* ... */
  }
  notifyCustomer(orderId: string): void {
    /* ... */
  }
  generateCancellationReport(filters: ReportFilters): Report {
    /* ... */
  }
}
```

The name promises one responsibility; the body delivers four.
The right move is to split. Each method becomes its own entity
or its own command. The class `OrderCancellation` then has only
the `cancel` method; the others live in their own types.

## What senior practitioners say

> "Manager. Controller. Helper. Handler. Writer. Reader.
> Converter. Validator. Router. Dispatcher. Observer. Listener.
> Sorter. Encoder. Decoder. This is the class names hall of shame.
> Have you seen them in your code? In open source libraries
> you're using? In pattern books? They are all wrong. What do
> they have in common? They all end in '-er.' And what's wrong
> with that? They are not classes, and the objects they
> instantiate are not objects. Instead, they are collections of
> procedures pretending to be classes."
>
> — Yegor Bugayenko, _Don't Create Objects That End With -ER_,
> March 2015.

Bugayenko's diagnosis is the philosophical ground of the rule.
A bare job title is a class that has no entity to be; it is a
collection of procedures that the caller orchestrates. The shape
exists; the entity does not.

> "If a class only has a single responsibility it will be pretty
> difficult to attach a Manager suffix to the class name."
>
> — Scott Muc, _Manager Suffixes Are a Code Smell_, June 2008.

Muc's observation operationalises Bugayenko. The suffix is a
proxy measurement for responsibility count. When the suffix is
necessary, the count is high.

> "Six methods each with around five unit tests: that's 30 unit
> tests, probably all in the same file name
> 'CartServiceTest'. That's beginning to be a lot harder to
> manage. [...] Every class should be a noun and every method
> should be a verb."
>
> — Charles-H lavoie, _"Service" should be a banned word_, Proper
> Code, June 2019.

Lavoie quantifies the cost. A bare `Service` accumulates methods
faster than it accumulates tests. The total cost of the class is
the methods times the tests; the suffix makes the cost invisible.

> "A command handler's job is to coordinate the execution of a
> command. It's named for the command, not the entity. The
> handler is named `CancelOrderHandler`, not `OrderHandler`."
>
> — Jimmy Bogard, _Domain Command Patterns - Handlers_,
> March 2018.

Bogard is the counter-example. The handler suffix is fine when
it is qualified by the command it handles. The shape Bogard
recommends — `CancelOrderHandler` — is exactly the second shape
above: qualifier plus role. The rule's allowance of qualified
suffixes is Bogard's contribution; the rule's refusal of bare
suffixes is Bugayenko's.

The four voices converge on the operational rule: a suffix is
acceptable when it describes the **role** in a single focal
operation; a suffix is refused when it is the only content of a
name and the class is unfocal.

## Enforcement

- **Code review**. A reviewer who sees a bare `-er` suffix in a
  class or type name (`UserManager`, `PaymentService`,
  `EventHandler`) blocks the PR and asks for a qualifier, a split,
  or an entity rename.
- **Naming audit**. A standing review of "which classes in this
  codebase have a bare `-er` suffix?" surfaces the candidates that
  slipped through. Each is a refactor candidate, not a backlog
  item.
- **Lint rule** (future). A custom ESLint rule can flag bare
  `-er` suffixes in class and type declarations. The rule's
  existence is the enforcement signal even before it is automated.

## Exceptions

A qualifier-plus-suffix name (`CancelOrderHandler`,
`UserCreationService`) is permitted. The qualifier is the focal
content; the suffix is the role. The rule refuses **bare** suffixes,
not **qualified** suffixes.

A test class name (`UserManagerTest`) is permitted because it
mirrors the type under test. The test class is not the entity; it
is the verification of the entity.

A variable that holds an instance briefly (`const manager = ...`)
is permitted. The type name carries the focal responsibility; the
variable name is local.

## See also

- **Rule 0002** — File Separation: a class with bare `-er` is
  usually a class that mixes types and operations; the rule on
  file separation makes that mixing visible.
- **Rule 0007** — Top-Down Composition: the same principle at
  the function level. A function called `processData` is the
  function-level equivalent of a `DataManager` class. The
  principle is the same — name the thing, not the job.
- **Rule 0011** — Filenames Are kebab-case: a class named
  `UserManager` usually lives in a file named `user-manager.ts`,
  which is the right casing. The rule's wrong shape is the class
  name, not the file name.
