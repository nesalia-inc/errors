# Architecture Rules

This folder collects the standing **architecture rules** for the
DeesseJS Errors repository. Unlike ADRs (which capture one decision at
a time), rules are durable, always-on constraints that every PR must
respect.

## Format

Each rule is stored as a Markdown file with the naming convention
`NNNN-short-slug.md`, where `NNNN` is a monotonically increasing
4-digit sequence. For example:

- `0001-typescript-strict-mode-required.md`
- `0002-no-runtime-any-leakage.md`

The sequence numbers are **never reused**. When a rule is rescinded,
the file is moved to `_superseded/` with a `Superseded by NNNN`
header at the top.

## Status lifecycle

Rules carry one of the following states:

- **Active** — currently enforced by CI or code review.
- **Enforced via CI** — the rule is checked automatically on every PR.
- **Superseded** — replaced by a later rule (cross-link required).
- **Deprecated** — kept on disk for context but no longer required.

## When to add a rule

Add a rule when:

- A constraint has come up three or more times in PR review.
- A constraint cannot be expressed in the type system alone.
- A constraint is not obvious from reading the code (e.g. it spans
  multiple files or workflows).

Do **not** add a rule for things that TypeScript or ESLint already
enforce — point to those tools instead.

## Authoring

Each rule should have:

1. **Rule** — one sentence that says what is required.
2. **Why** — the architectural reason, in 2-3 sentences.
3. **Enforcement** — CI check, lint rule, or review-only.
4. **Exceptions** — if any, with the rationale for each.

Rules must be short. If a rule needs more than a page, it is probably
a process document, not a rule — file it under
`docs/internal/engineering/process/` instead.

## Active rules

- See the files in this directory for the current rule set.

## See also

- [`../decisions/`](./decisions/) — Architecture Decision Records.
- [`../../internal/engineering/process/`](../../internal/engineering/process/) — process documents
  (release runbook, PR authoring guide, etc.).
