---
"@deessejs/errors": patch
---

Add a Vitest harness in `apps/web/` that locks in the SEO surface the v1.4.1 cleanup batch protects (`apps/web/tests/seo/`). The suite runs in CI on every PR to `staging`; it does not change any published runtime. The `apps/web` workspace does not publish, so the changeset is included solely to satisfy the `Require changeset` lint in `.github/workflows/ci.yml` for PRs that touch files outside `apps/web/` itself.
