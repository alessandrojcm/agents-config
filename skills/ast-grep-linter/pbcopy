---
name: ast-grep-linter
description: Set up ast-grep as a structural linting project and wire its LSP into opencode.
disable-model-invocation: true
---

# ast-grep Linter Setup

Set up ast-grep as a **project-scoped structural linter** and wire its LSP into opencode's diagnostics loop. ast-grep enforces rules no text/regex linter can express — `Promise.all` containing `await`, `useEffect` without a cleanup, a route handler missing the auth middleware — because it matches AST shape, not string.

This is a one-session, four-phase workflow: detect → interview → write → wire.

## Phase 1 — Baseline detection

**Find what's already enforcing style.** A new ast-grep project should extend the existing linting baseline, not duplicate rules text linters already cover. Scan the project root for linter configs so the interview (phase 2) can steer toward rules the baseline misses.

Every project has a stack, and every stack has a baseline linter or three. Read the project root for the signals below; report what you found before moving on.

- **JavaScript/TypeScript** — `.eslintrc*`, `eslint.config.*` (flat config), `biome.json`, `oxlint.json`, `.oxlintrc.json`, `deno.json` (lint section), `package.json` `eslintConfig`. Note plugins in use — they reveal what's already enforced (import order, react-hooks, etc.).
- **Python** — `pyproject.toml` `[tool.ruff]`/`[tool.flake8]`, `.flake8`, `setup.cfg` `[flake8]`, `ruff.toml`, `.pylintrc`, `mypy.ini`/`pyproject.toml` `[tool.mypy]`.
- **Go** — Go has `gofmt`/`go vet` built in; `.golangci.yml`/`.golangci.yaml` for `golangci-lint` is the extra-baseline signal.
- **Rust** — `clippy` is the baseline (always on via `cargo clippy`); no config file needed. Treat anything clippy doesn't flag as fair game for ast-grep.
- **Ruby** — `.rubocop.yml`, `standard.yml` (Standard gem).
- **Java/Kotlin** — `checkstyle.xml`, `.editorconfig` (kotlin linting), `detekt.yml`.
- **Other stacks** — look for `*lintrc*`, `.editorconfig`, anything matching `*lint*` in the root. When unsure, ask the user what they use.

**Completion criterion:** every linter config file in the project root accounted for, with a one-line note of what each enforces. If a stack has no baseline linter at all, say so explicitly — that widens the candidate surface for phase 2.

## Phase 2 — Interview for rule candidates

Interview the user for what to enforce. Run a **relentless interview** (see `/grilling`): one question at a time, don't accept the first answer, probe until each candidate rule is precise enough to write.

Ground the interview in the baseline. For each candidate the user proposes, the question is: _does the baseline already cover this?_ If yes, drop it — ast-grep's value is structural enforcement the baseline can't reach. If no, press on the rule's intent until it's concrete enough to draft.

Ask for rule candidates directly, but seed the conversation with prompts that hint at what ast-grep uniquely catches — these are **leading prompts**, not a checklist:

- "Patterns you've reviewed out in PRs more than once — shape-based, not formatting."
- "Invariants that hold across a module: every handler passes through X, every Y is created with Z."
- "Anti-patterns your text linter flags with a fragile regex you don't trust."
- "Constructs banned on your team but allowed by the language: a specific API, a forbidden import, a shape like `useEffect` without cleanup."

For each candidate the user names, press until you can answer:

1. **What node does it match?** (the target — e.g. `Promise.all($_)`, `useEffect($_, [])`)
2. **What relation makes it wrong?** (e.g. `has: { pattern: await $_, stopBy: end }`, `not: { has: { kind: return_statement } }`)
3. **Is there a `fix`?** Auto-fix is optional but powerful — see the rule reference. If the user wants one, draft the replacement template now.
4. **What severity?** `error` / `warning` / `hint` / `info` — match the team's tolerance.
5. **What language?** Pick from the alias list (see rule reference).

**Completion criterion:** a written list of rule candidates, each with target, relation, fix (or "none"), severity, language. Every candidate distinct from what the baseline linter already covers. If the user wants zero rules and just the LSP wired up, stop here and skip to phase 4 with an empty `rules/` directory.

## Phase 3 — Scaffold and write rules

Create the project scaffolding and write each rule from phase 2 as a YAML file.

Run `ast-grep new` in the project root — it interactive-prompts for `rules/`, `rule-tests/`, `utils/` locations and generates `sgconfig.yml`. Accept the defaults unless the user prefers otherwise. The result:

```
project-root
  ├ rules/           # one .yml per rule
  ├ rule-tests/      # test fixtures
  ├ utils/           # global utility rules
  └ sgconfig.yml     # project config (ruleDirs + utilDirs)
```

For each candidate from phase 2, write `rules/<id>.yml`. Structure:

```yaml
id: <kebab-case-id>
message: <human-readable, shown in diagnostics>
severity: error  # or warning / hint / info
language: TypeScript  # one alias from the list
rule:
  pattern: <target pattern>  # or kind / regex / relational / composite
  # ...relation fields as designed in phase 2
# fix: <replacement template>  # only if phase 2 specified one
# note: <longer explanation>  # optional, for non-obvious rules
# utils: <local utility rule ids>  # optional, for reuse
```

For anything beyond a flat `pattern:` rule — relational (`has`/`inside`/`follows`/`precedes`), composite (`all`/`any`/`not`/`matches`), `kind`, `regex`, `fix`, `transform`, `rewriter` — consult **[references/rule_reference.md](references/rule_reference.md)** for the field syntax and worked examples. Don't guess YAML structure from memory; the reference has the authoritative shapes.

Validate every rule against a test fixture before moving on. For each rule:

1. Write `rule-tests/<id>-test.yml` with valid and invalid code samples (the `ast-grep new rule` flow generates a stub).
2. Run `ast-grep test` from the project root. It reports pass/fail per fixture.
3. A rule that fails its test is a wrong rule — fix the YAML, not the test. Re-run until green.

**Completion criterion:** `ast-grep scan` runs clean from the project root (no parse errors, no missing-config warnings), and `ast-grep test` passes for every rule that has a test fixture. Every rule from phase 2 is a file in `rules/`.

## Phase 4 — Wire the LSP into opencode

The ast-grep LSP pushes diagnostics from the rules you just wrote into opencode's agent feedback loop — the agent sees violations live, like TypeScript or eslint diagnostics. **Per-project**: ast-grep rules live under `sgconfig.yml` in the project root, so the LSP config goes in the **project's** `opencode.json` (or `.opencode/opencode.json`), not the global `~/.config/opencode/opencode.json`.

Edit the project's opencode config and add an `ast-grep` entry under `lsp`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "lsp": {
    "ast-grep": {
      "command": ["ast-grep", "lsp"],
      "extensions": [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts",
                     ".vue", ".svelte", ".astro",
                     ".py", ".pyi",
                     ".go", ".rs", ".java", ".kt", ".kts",
                     ".rb", ".gemspec",
                     ".c", ".h", ".cpp", ".cc", ".hpp", ".cxx", ".hh", ".c++",
                     ".cs", ".css", ".html", ".htm", ".xhtml",
                     ".ex", ".exs", ".hs", ".lhs", ".hcl",
                     ".lua", ".nix", ".php",
                     ".scala", ".sc", ".sbt", ".sol", ".swift",
                     ".json", ".yml", ".yaml",
                     ".sh", ".bash", ".zsh"]
    }
  }
}
```

The `extensions` list covers every language ast-grep supports (see the languages reference). Trim it to only the extensions present in the project — don't start the server for languages the codebase doesn't use.

The LSP **requires `sgconfig.yml` in the project root** — phase 3 already created it. The LSP discovers rules from `ruleDirs` in that config; no further LSP-side rule config exists. To point the LSP at a non-root `sgconfig.yml`, use `command: ["ast-grep", "lsp", "-c", "path/to/sgconfig.yml"]`.

**Completion criterion:** the project `opencode.json` has an `ast-grep` LSP entry with a trimmed `extensions` array, and `sgconfig.yml` exists at the path the LSP will read (project root by default). Tell the user to restart opencode (or reload the project) for the LSP to take effect.

## Anti-scope

- **Don't write rules the baseline linter already enforces.** A `no-unused-vars` ast-grep rule next to eslint's `no-unused-vars` is duplication — the baseline wins on a text linter's home turf. ast-grep earns its place on structural rules the baseline can't reach.
- **Don't add the LSP to global opencode config.** ast-grep rules are per-project (`sgconfig.yml`), so the LSP must be per-project too. A global LSP entry would start in projects with no `sgconfig.yml` and produce nothing.
- **Don't skip `ast-grep test`.** A rule that parses but matches the wrong nodes is worse than no rule — it trains the user to ignore diagnostics. Test fixtures catch this.
- **Don't run `ast-grep new` non-interactively.** It's designed to prompt; piping answers is fragile. Run it interactively, or hand-write `sgconfig.yml` + `rules/` if you need determinism.