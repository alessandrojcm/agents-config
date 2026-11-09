# Fit checks

The Fit axis asks whether the diff fits the codebase it lands in. Standards reads the diff against documented rules; Fit reads it against the code that already exists. Every check is a **precedent** search: find the existing code the new code should have followed. Paths below are relative to this file.

## 1. Search for precedents

When the prompt includes a **precedent list** (from `/implement`), check it instead of searching from scratch:

- for each listed precedent, confirm the new code actually follows it: calls or extends the helper, matches the pattern, sits beside the named siblings;
- search the repo only for the gaps: items marked "none", and anything the diff adds that the list omits.

Without a list, search the repo outside the diff for the precedent of each thing the diff adds:

- each new function, type, class, hook, or module → an existing one with the same job;
- each new solution to a recurring problem (errors, validation, data access, config, logging, dependency wiring, async) → the way the repo already solves it;
- each new test → the existing tests for the same unit or seam;
- each new file → its siblings: where files of the same kind and the same domain concept already live.

Search by behaviour as well as by name: grep for the key calls, types, and literals the new code uses, and read the neighbours of every touched directory. For placement, read `CONTEXT-MAP.md` / `CONTEXT.md`, `AGENTS.md` and `docs/agents/**`, and the directory layout itself.

**Completion criterion:** every added function, type, test, and file has been checked against its listed precedent or searched, and each one ends with either a finding or a clear.

## 2. Apply the checks

Each check reads *what it is* → *how to fix*.

- **Reinvented code** — the diff adds a function, type, or module the repo already has, under another name or in another place. → call or extend the existing one.
- **Divergent idiom** — the diff solves a recurring problem differently from the repo's established way. → follow the established pattern; if the new way is genuinely better, raise it as a deliberate repo-wide change.
- **Redundant test** — a new test asserts a behaviour an existing test already covers at the same seam. → delete it, or add the new case to the existing test.
- **Hollow test** — a new test that would stay green if the behaviour broke: tautological, asserting on mocks, coupled to implementation, or exercising the language or framework instead of the code. Criteria and examples: the Anti-patterns section of [`../tdd/SKILL.md`](../tdd/SKILL.md) and [`../tdd/tests.md`](../tdd/tests.md). → rewrite it against the seam's observable behaviour, or delete it.
- **Misplaced file** — a new production or test file sits apart from its siblings, or outside the domain / bounded context that owns its concept. → move it beside its siblings, into the owning context.

## 3. Weigh the evidence

- Every finding carries its evidence: the precedent's path and symbol or test name, or for Hollow test the quoted assertion.
- A precedent is a pattern repeated across the repo or recorded in its docs. Label a finding **hard** when its precedent is documented or clearly repeated, and a **judgement call** when it rests on a single instance or a mixed layout.
- The docs outrank the code: where a documented standard retires an old pattern, new code that follows the docs is correct.
