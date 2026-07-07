---
name: codebase-patterns
description: Audit a codebase for contribution patterns, record them in AGENTS.md, and enforce the stable ones with ast-grep.
disable-model-invocation: true
---

# Codebase Patterns

Run a **pattern audit**: discover how this repository wants contributions to look, capture the conventions for future agents, then turn enforceable patterns into ast-grep rules.

## 1. Build the map

Start from the repository root. Read existing guidance first: `AGENTS.md`, `docs/agents/**`, `CONTEXT.md`, ADRs, README files, package/build config, linter config, and test config.

Then scan the tree and produce a concise map:

- production roots, test roots, generated/vendor roots, scripts, config, docs
- dominant languages and frameworks
- module boundaries: layer, feature, domain, route, package, class, adapter, or mixed
- naming and placement conventions for new production code, tests, fixtures, and config

Use file globbing for the census, direct reads for known files, ast-grep for focused structural checks, and `@indexer` for open-ended structural exploration. Keep evidence: each claimed pattern needs representative paths or code shapes.

**Completion criterion:** every top-level directory and every production/test source root is classified, and every classification has at least one concrete file-path or code-shape example.

## 2. Extract the idiom

Turn the map into a **pattern ledger**. Separate observed facts from interpretation.

For each pattern, record:

- **Pattern** — the convention in imperative form: "Put X under Y", "Expose modules through Z", "Construct A with B".
- **Evidence** — files, symbols, or repeated AST shapes that prove it.
- **Reach** — where it applies and where it does not.
- **Confidence** — high when repeated and config-backed, medium when repeated but undocumented, low when inferred from few examples.
- **Contribution rule** — the advice a future agent needs when adding similar code.

Cover these ledgers before moving on:

1. file structure
2. module organization, including whether the shape is DDD, layered, OOP, functional, route-driven, plugin-based, or mixed
3. paradigms: state, effects, errors, dependency injection, async/concurrency, data access, public interfaces
4. language and framework idioms already present in the project
5. testing, fixtures, generated code, boundaries, and any local anti-patterns reviewers would reject

If a pattern is ambiguous, do the legwork: inspect more examples or ask one pointed question. Do not promote a guess to high confidence.

**Completion criterion:** the ledger has an entry for each category above, no high-confidence entry lacks evidence, and unresolved ambiguities are listed separately.

## 3. Record durable guidance

Load `/update-agents-md` and follow it. Write only patterns useful to future agents.

Prefer atomic bullets in `AGENTS.md`; if the guidance grows past a short section, create or update `docs/agents/codebase-patterns.md` and link to it from `AGENTS.md`.

Keep the ledger's single source of truth: once a pattern is recorded in AGENTS documentation, do not restate the same rule elsewhere unless linking back to it.

**Completion criterion:** the relevant AGENTS entry exists, matches the observed evidence, and contains no obsolete or duplicate guidance.

## 4. Enforce the stable patterns

Convert the ledger into an **enforcement plan**.

For every pattern, decide:

- **Enforceable** — ast-grep can match the required or forbidden AST shape.
- **Document-only** — the rule is architectural, semantic, or too context-dependent for a reliable structural lint.
- **Already enforced** — an existing linter, typechecker, formatter, or test already covers it.

For each enforceable pattern, prepare a candidate rule with: id, language, target shape, relation, severity, message, fix if safe, positive examples, and negative examples. Use high-confidence patterns first; a noisy rule is worse than documentation.

Load `/ast-grep-linter` and use the candidate rules as its rule-candidate input. Follow that skill for baseline detection, scaffolding, rule YAML, fixtures, `ast-grep test`, `ast-grep scan`, and LSP wiring. If a pattern cannot be expressed cleanly after testing, demote it to document-only and record why in the enforcement plan.

**Completion criterion:** every enforceable high-confidence pattern is represented by a tested ast-grep rule, and every non-enforced pattern has a documented reason: document-only, already enforced, or too noisy.

## 5. Report back

Return a short report with:

- the codebase shape in one paragraph
- the highest-confidence contribution rules recorded in AGENTS documentation
- ast-grep rules added or updated, with test status
- document-only patterns and why they stayed document-only
- any open questions for maintainers

**Completion criterion:** the user can see what changed, what is enforced, and what remains a human convention.
