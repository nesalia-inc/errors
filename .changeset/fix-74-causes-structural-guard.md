---
"@deessejs/errors": patch
---

Replace the cast in `causes/index.ts` (`error as ErrorInstance`) with a structural guard (`'causes' in error && Array.isArray(error.causes)`). The function no longer imports `ErrorInstance` and the input is honest about its `unknown` shape. The first example in the JSDoc was broken (a template literal cut mid-sentence); it is now a complete try/catch example. A regression test verifies that an object carrying `causes: 'not an array'`, `causes: null`, or an array-like (non-`Array`) value returns `[]`. Public API unchanged; 83 tests pass (82 → 83). Closes #74.