# 0001 — Project Mindset: Excellence by Default

**Status**: Active (enforced through code review and contributor onboarding).
**Date**: 2026-08-11.

## Rule

Every contribution to this repository must be made **as if it were the
last commit before the project reached its largest possible audience**.
The standard is "would I be comfortable explaining this line to a
contributor joining in two years, in front of a million users, with no
opportunity to revise it first?"

There is no "good enough for now". There is no "we'll fix it later".
The work done today is the work that ships at scale.

## Why

A foundation library reaches a long tail of users. Each shortcut
compounds: a single `as any` raté costs a fraction of a second of
author time today, then costs hours of debugging at scale tomorrow, then
becomes the reason a downstream team migrates to a competitor. The
cost asymmetry is brutal in one direction and trivial in the other.

The same logic applies to **understanding**. A line of code written
without fully grasping its consequences will eventually be the line
that breaks. There is no shortcut around comprehension. Anyone who
finds themselves reaching for one is, by definition, the wrong person
to write that line at that moment.

The codebase is read far more often than it is written. Every
contribution must optimise for the **reader**, not the author.

## The ten invariants

Every contribution must satisfy all of these. They are not
guidelines; they are the floor.

1. **No shortcuts.** A cast that bypasses the type system is a lie to
   the audience. Either the return type is what you say it is, or it
   is not, and the code should reflect that truthfully.

2. **No conscious debt.** "We'll fix it later" is a promise to a
   future that may not exist. The only moment we are paid to do
   something well is the moment we are doing it. There is no later
   that justifies a shortcut now.

3. **Understand before writing.** If the API being called is not
   understood in full, the code is not ready to be written. Reading
   the source, asking the maintainer, or waiting for an answer are
   all acceptable next steps. Guessing is not.

4. **No speculative abstractions.** An abstraction added "in case"
   is a wall the next contributor will have to climb. Abstract only
   when three concrete cases exist (Rule of Three). Until then, the
   duplication is cheaper than the abstraction.

5. **No `any`.** `unknown` is the safe escape hatch. If a type cannot
   be expressed, model it explicitly — through a schema, a discriminated
   union, or a generic — rather than closing the eyes.

6. **No silent failures.** A `try`/`catch` that swallows an error is
   a betrayal of the user. Either re-raise, transform with explicit
   context, or log through a structured channel. Never silently.

7. **No compiler bypass.** `@ts-expect-error`, `as` casts, `// @ts-ignore`,
   dynamic `require`, and friends are signals that the code has a
   problem. Address the problem; do not silence the alarm.

8. **No dependency without justification.** A new dependency is a
   long-term commitment. Before adding it, be able to answer: what is
   its license, its release cadence, its bus factor, and why this
   one and not its alternatives. If the answer is "it has stars", it
   is not ready.

9. **Optimise for the reader.** The next maintainer is the
   audience. If a PR is harder to read than to write, it is the
   wrong PR. Comments explain _why_, not _what_. Names carry
   meaning; comments carry context that names cannot.

10. **Excellence is silent.** No commit message that celebrates. No
    PR description that congratulates itself. The work is the
    artefact. If it needs explanation to be recognised as good, the
    work is not good enough.

## Enforcement

- **Code review** is the primary gate. A reviewer who sees any of the
  ten invariants violated is expected to block the PR, regardless of
  urgency or seniority of the author.
- **Onboarding** documents must include this rule verbatim. New
  contributors who arrive through a fast path (open-source
  contribution, AI-assisted PR) are pointed here on their first
  interaction with the repo.
- **Self-removal**: contributors who consistently violate the
  invariants despite feedback are removed from the maintainer list.
  This is not a punishment; it is a recognition that the project and
  the contributor have different standards, and the project's
  standard is the one that ships.

## Exceptions

None. The invariants are absolute. A request for an exception is a
signal that the request should be re-scoped until it no longer
requires one.
