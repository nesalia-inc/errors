# 0005 — Named Algorithms and Independent Data Structures

**Status**: Active (enforced through code review).
**Date**: 2026-08-11.

## Rule

Three invariants, all anchored in the same principle: a reader should
be able to understand **what** the code does without first having to
decipher **how** it is described.

1. **Algorithms are named.** A depth-first search described in three
   lines of inline code with a `// DFS walk` comment is not a named
   algorithm. It is a comment that happens to be near code. A named
   algorithm is a function, a type, or a class whose name is the
   concept, and whose body is the implementation. The reader should
   be able to read the name and trust it.

2. **No diminutives.** Names carry the meaning that comments cannot.
   `DFS`, `JSON`, `URL`, `id`, `mgr`, `ctx`, `arr`, `fn`, `cb` are
   initials or abbreviations that a reader has to mentally expand
   before they can think about the code. Spell them out:
   `depthFirstSearch`, `inheritanceDepth`, `errorStack`, `factory`,
   `context`, `items`, `callback`. The cost of the extra characters
   is paid once; the cost of the abbreviation is paid every time
   the code is read.

3. **Data structures are explicit and independent.** A stack, queue,
   heap, ring buffer, or sorted map used by an algorithm is a
   **thing**. It deserves a type, a file, and a name. It must not
   be inlined as a primitive array with `push`/`pop` because that
   was the first thing that worked. More importantly, the data
   structure must be **independent of the algorithm that first used
   it**: an `ErrorInheritanceStack` for the inheritance walk must
   not encode "depth-first" in its type. If a second algorithm needs
   a stack for breadth-first traversal, it must be able to use the
   same type.

## Why

A comment that names an algorithm is a **deferred definition**. The
comment promises a structure that does not exist; the code that
follows is responsible for delivering on the promise. If the code
delivers, the comment becomes redundant; if it does not, the comment
becomes a lie. A function whose name is the algorithm is honest by
construction: the name is the contract, the body is the proof.

Diminutives are a tax that compounds. A codebase that uses `ctx`
everywhere trains its readers to translate every line. A codebase that
spells `context` trains them to read. The first codebase looks
"professional"; the second is professional.

Coupling a data structure to the algorithm that first used it is a
form of premature commitment. The next algorithm that needs the
same structure either duplicates it or forks it; either way the
codebase loses. Independence is what makes a `Stack<T>` reusable
across BFS, DFS, and undo-log implementations.

## What this looks like in violation

Three shapes that this rule exists to catch:

- **Inline algorithm with comment**:

  ```ts
  // DFS walk of inheritance tree using stack (prevents GC pressure)
  const stack: ErrorFactory[] = [factory as ErrorFactory];
  const seen = new Set<ErrorFactory>();
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    if (current === ErrorType) return true;
    const inherits = (current as ErrorFactory).inherits;
    if (inherits !== undefined) {
      if (Array.isArray(inherits)) {
        for (let i = 0; i < inherits.length; i++) {
          stack.push(inherits[i]);
        }
      } else {
        stack.push(inherits);
      }
    }
  }
  ```

  What is wrong: the comment names the algorithm, but the algorithm
  is not a function. The reader has to read twenty lines to confirm
  that the comment is accurate. The stack is a primitive `Array`
  whose only contract is `push` and `pop`; a second algorithm cannot
  reuse it without duplicating the type. The names `stack`, `seen`,
  `current`, `inherits` are local; a reader scanning the function
  does not know which is which.

  What the right shape looks like:

  ```ts
  const result = walkInheritance(
    factory,
    inheritanceDepthFirst(),
    (current) => current === ErrorType
  );
  return result.found;
  ```

  Where `walkInheritance` is a generic traversal function in a
  shared module, `inheritanceDepthFirst` is a stack-based strategy
  in its own file, and the predicate is named for what it tests.

- **Diminutive-heavy naming**:

  ```ts
  function mgrErr(err: ErrT, ctx: Ctx): void {
    const m = err.msg;
    const arr = ctx.items.map((it) => it.id);
    cb(arr);
  }
  ```

  What is wrong: a reader has to translate `mgr`, `ErrT`, `Ctx`,
  `m`, `arr`, `cb`, `it` before they can think about the function.
  The function body is shorter to type than to read.

  What the right shape looks like:

  ```ts
  function reportError(error: DomainError, requestContext: RequestContext): void {
    const message = error.message;
    const identifiers = requestContext.items.map((item) => item.identifier);
    notifyListeners(identifiers);
  }
  ```

- **Algorithm-specific data structure**:

  ```ts
  // In the inheritance walker
  interface InheritanceWalkerState {
    stack: ErrorFactory[]; // Implicit: depth-first
    seen: Set<ErrorFactory>;
    found: boolean;
  }
  ```

  What is wrong: the type encodes the algorithm in its shape. A
  breadth-first walker cannot reuse `InheritanceWalkerState` without
  duplicating the interface. The right shape is to separate the
  walker from the strategy:

  ```ts
  // Stack.ts (independent)
  interface Stack<T> {
    push(item: T): void;
    pop(): T | undefined;
    isEmpty(): boolean;
  }

  // depth-first.ts (strategy)
  function depthFirst<T>(
    start: T,
    expand: (node: T) => Iterable<T>,
    visit: (node: T) => boolean | void
  ): boolean {
    /* ... */
  }

  // Inheritance traversal (consumer)
  function isInheritedFrom(factory: ErrorFactory, target: ErrorFactory): boolean {
    return depthFirst(
      factory,
      (f) => f.inherits ?? [],
      (f) => f === target
    );
  }
  ```

## When this rule does not apply

A single-caller helper whose concept is local to its file lives
inline. See rule 0003. The point of this rule is to capture **shared
concepts** (an algorithm, a data structure, a name) and to surface
them at the right grain. A five-line local computation that does not
deserve a name does not need one.

## Enforcement

- **Code review**. A reviewer who sees an inline algorithm with a
  comment-naming-it blocks the PR and asks for the algorithm to be
  extracted to a function or type.
- **Naming audit**. A standing review of function and variable names
  during PR review catches abbreviations before they land. "If I
  had to look up what this abbreviation means, it is wrong."
- **Structure audit**. A quarterly review of "where does this data
  structure live, and which algorithms use it?" surfaces the
  structure-vs-algorithm coupling when it is still small.

## Exceptions

- Domain abbreviations that are **standardised in the language or
  the ecosystem**: `URL`, `JSON`, `HTML`, `CSS`, `API`, `HTTP`,
  `ID` (when it refers to the concept of an identifier, not a
  specific variable). These are not abbreviations the reader has to
  expand; they are words.
- Local loop variables in tight, single-screen functions, where the
  context makes their meaning obvious. `i` in a five-line loop is
  fine; `i` in a fifty-line function is not.
- Generated code, vendor code, and bindings to external systems
  where the shape is fixed by the other side.

## See also

- **Rule 0007** — Top-Down Composition: the discipline that puts
  the named algorithms this rule produces at the top of their
  callers. This rule extracts; 0007 composes.
- **Rule 0009** — Open Extension, Closed Modification: the discipline
  that turns the named data structures (Stack, Queue, etc.) into
  reusable registries.
