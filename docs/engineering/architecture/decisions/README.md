# Architecture Decisions

This folder collects the Architecture Decision Records (ADRs) for the
DeesseJS Errors repository. Each ADR captures one significant
architectural choice, the context that led to it, and the consequences
that followed.

## Format

Each decision is stored as a Markdown file with the naming convention
`NNNN-short-slug.md`, where `NNNN` is a monotonically increasing
4-digit sequence. For example:

- `0001-staging-first-branching-model.md`
- `0002-npm-trusted-publishing.md`

The sequence numbers are **never reused**, even when an ADR is
superseded — superseded ADRs are linked from the new one but kept
in place for the historical record.

## Status lifecycle

Every ADR carries one of the following statuses, set in its frontmatter
and reflected in the title:

- **Proposed** — under discussion, no commitment yet.
- **Accepted** — adopted by the team; future work must respect it.
- **Superseded** — replaced by a later ADR (cross-link required).
- **Deprecated** — kept on disk for context but no longer applies.

## When to write an ADR

Write one whenever a choice:

- Affects the public API surface (`packages/errors/src/`).
- Changes the release pipeline (`.github/workflows/`, `release.yml`).
- Sets a long-lived convention (branching, commits, dependencies).
- Would surprise a future contributor if it were not written down.

Do **not** write an ADR for one-off implementation details that live
inside a single PR; the PR description is enough.

## Authoring

Use the [`docs/internal/engineering/process/`](../../internal/engineering/process/)
templates if you want a starter, but a minimal ADR only needs:

1. **Context** — what problem we were solving.
2. **Decision** — what we chose to do.
3. **Consequences** — what becomes easier, what becomes harder.

Keep it short. The point is to be readable in 5 minutes a year from now.
