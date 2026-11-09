---
name: ast-grep-linter
description: Set up ast-grep as a project's structural linter, with tested rules the baseline linter can't express, wired into the project's lint command.
disable-model-invocation: true
---

# ast-grep Linter Setup

ast-grep gives a project its own structural rules, matched on AST shape, without writing a linter plugin. Examples: `Promise.all` wrapping an `await`, a `useEffect` with no cleanup, a route handler missing the auth middleware. Baseline linters such as ESLint, ruff and clippy are AST-based too. ast-grep's place is the project-specific **invariants** they don't ship.

Four phases in one session: detect → interview → write → adopt.

## Phase 1: Baseline

Find what already enforces style, so the interview steers toward what the baseline misses. Read the linter configs at the project root, and in each workspace package of a monorepo: ESLint/Biome/oxlint, ruff/flake8/pylint, golangci-lint, clippy, RuboCop, detekt/Checkstyle, or whatever the stack uses. Ask the user when you're unsure.

For each linter, note what it enforces. Note especially its plugins and any custom-rule hooks it already has (ESLint `no-restricted-syntax` / `no-restricted-imports`, ruff `banned-api`, golangci `forbidigo`). Those hooks already cover most "ban X" rules.

If an `sgconfig.yml` already exists, read its rules. You're extending that project, not scaffolding a new one.

**Completion criterion:** every linter config is accounted for with a one-line note of what it enforces. If the stack has no baseline linter, say so explicitly, because that widens the candidate surface.

## Phase 2: Interview for rule candidates

Interview the user for what to enforce, using the `grilling` skill's relentless style: one question at a time, never settling for the first answer. Check each candidate against the phase 1 notes. If the baseline or one of its hooks already covers it, drop it.

Seed the conversation with **leading prompts**, not a checklist:

- "Patterns you've reviewed out of PRs more than once: about shape, not formatting."
- "Invariants across a module: every handler passes through X, every Y is created with Z."
- "Rules you enforce today with a fragile regex or a custom plugin you'd rather not maintain."
- "Constructs the language allows but your team bans: an API, an import, a shape."

Press each candidate until you can write down:

1. **Target:** the node it matches, e.g. `Promise.all($_)`.
2. **Relation:** what makes that node wrong, e.g. `has: { pattern: await $_, stopBy: end }`.
3. **Evidence:** at least one real offending snippet and one legitimate look-alike that must stay quiet. Search the codebase for these yourself and confirm them with the user. They become the test fixtures.
4. **Scope:** the files it applies to, and what to exclude (tests, generated code, migrations).
5. **Fix:** a replacement template, or "none".
6. **Severity:** only `error` makes `ast-grep scan` exit non-zero, and so fails CI. A rule with no `severity` defaults to `hint`.
7. **Language:** see the rule reference. `TypeScript` does not scan `.tsx` files.

**Completion criterion:** a written list with all seven fields for every candidate, none of which the baseline already covers. If the list is empty, stop. There's nothing to set up.

## Phase 3: Write and test the rules

If the project has no `sgconfig.yml`, write one by hand at the project root:

```yaml
ruleDirs:
  - rules
testConfigs:
  - testDir: rule-tests
utilDirs: # only if you add global utility rules
  - utils
```

Write it by hand because `ast-grep new project -y` records **absolute** paths, which break for everyone else once the file is committed. `ast-grep new rule <id> -l <lang> -y` is fine for generating a stub rule and test.

Work through each rule test-first:

1. **Fixture.** Write `rule-tests/<id>-test.yml`. Put the phase 2 evidence under `invalid` and `valid`, then add edge cases: nesting, aliased imports, async and arrow variants.
2. **Rule.** Write `rules/<id>.yml`:

   ```yaml
   id: <kebab-case-id>
   message: <one line, shown in diagnostics>
   severity: error # warning / info / hint
   language: TypeScript
   rule:
     pattern: <target pattern> # plus relational/composite fields from phase 2
   # files / ignores: <globs from phase 2 scope>
   # fix: <replacement template>
   # note: <longer explanation for non-obvious rules>
   ```

   For anything beyond a flat `pattern:` (relational, composite, `kind`, `regex`, `constraints`, `fix`, `transform`, multi-language rules), read [references/rule_reference.md](references/rule_reference.md) for the field shapes. To look up node kinds, use the `astgrep_debug_pattern` tool if you have it, or `ast-grep run --debug-query=cst -p '<snippet>' -l <lang>`.
3. **Red to green.** Run `ast-grep test --skip-snapshot-tests` until every case passes. `N` (noisy) means valid code was flagged. `M` (missing) means invalid code wasn't. Fix the rule, not the fixture. Change a fixture only when the user agrees the snippet was classified wrong. A rule that matches the wrong nodes trains people to ignore its diagnostics.
4. **Snapshots.** Once green, run `ast-grep test -U` to record `rule-tests/__snapshots__/`, which you commit. Plain `ast-grep test` fails with `W` until those snapshots exist.

**Completion criterion:** every phase 2 candidate is a file in `rules/` with a fixture in `rule-tests/`, and plain `ast-grep test` passes.

## Phase 4: Adopt in the codebase

1. **Scan.** Run `ast-grep scan` from the project root and triage every hit.
   - A false positive is a rule bug. Add it as a `valid` fixture and go back to phase 3, step 3.
   - Report true positives to the user as a count per rule. Agree on one way to handle each rule:
     - fix them now with `ast-grep scan --filter '^<id>$' -U`, which applies that rule's `fix`;
     - suppress individual lines with `// ast-grep-ignore: <id>`;
     - narrow the rule with `ignores`; or
     - ship it below `error` until the violations are cleaned up.
2. **Wire.** Add `ast-grep scan` and `ast-grep test` to the entry point where the baseline linter already runs: the `lint` script, a Makefile target, pre-commit, or CI. Make sure ast-grep is installed there, through the stack's package manager (`@ast-grep/cli` on npm, `ast-grep-cli` on PyPI) or the CI image. For inline CI annotations, use `ast-grep scan --format github`.

**Completion criterion:** `ast-grep scan` exits 0 from the project root, every remaining diagnostic is one the user chose to keep, and the project's lint entry point runs both `ast-grep scan` and `ast-grep test`.
