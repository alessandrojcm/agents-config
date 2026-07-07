# ast-grep Rule Reference

Authoritative shapes for writing `rule.yml` files. Consulted from `SKILL.md` phase 3 when a rule needs anything beyond a flat `pattern:`. Source: [ast-grep guide](https://ast-grep.github.io/guide/rule-config.html) and [config reference](https://ast-grep.github.io/reference/yaml.html).

## Rule file structure

One YAML file = one rule (multiple rules possible via `---` separators, but one-per-file is the convention `ast-grep new rule` produces).

```yaml
id: <kebab-case-id>           # required, unique
language: TypeScript           # required, capitalized form (see Languages below)
rule:                          # required, the rule object
  <atomic | relational | composite fields>
# --- optional linting fields ---
message: <single-line, shown in diagnostics>
severity: error                # error | warning | hint | info | off
note: <longer markdown explanation, no metavariables>
# fix: <template string or FixConfig>   # auto-fix, see Fix below
# constraints:                          # metavariable filters, see Constraints
#   <NAME>: { <rule> }
# utils:                                # local utility rules, see Utility
#   <id>: { <rule> }
# files: [<globs>]                      # scope rule to files
# ignores: [<globs>]                    # exclude files
# url: <doc link>
# labels:                               # diagnostic highlighting
#   <NAME>: { style: primary|secondary, message: ... }
```

## Languages

The `language:` field takes the **capitalized** name (not the CLI alias). Valid values: `Bash`, `C`, `Cpp`, `CSharp`, `Css`, `Elixir`, `Go`, `Haskell`, `Hcl`, `Html`, `Java`, `JavaScript`, `Json`, `Kotlin`, `Lua`, `Nix`, `Php`, `Python`, `Ruby`, `Rust`, `Scala`, `Solidity`, `Swift`, `Tsx`, `TypeScript`, `Yaml`.

## Atomic rules

Match one node directly. Five kinds:

### `pattern`

A string parsed as code, with metavariables:

- `$NAME` — single node (one capture)
- `$$$NAME` — multiple nodes (zero or more, like `$$$ARGS`)
- `$_` — wildcard, single node, unnamed

```yaml
rule:
  pattern: console.log($GREETING)
```

**Pattern object** — when a string pattern parses ambiguously (e.g. `$FIELD = $INIT` parses as `assignment_expression`, not class field), use object form with `context` + `selector`:

```yaml
rule:
  pattern:
    context: class A { $FIELD = $INIT }
    selector: field_definition
```

**`strictness`** (optional on pattern object): `cst` > `smart` (default) > `ast` > `relaxed` > `signature`. Default `smart` skips unnamed nodes; use `cst` to match every node, `signature` to match only node kinds ignoring text.

### `kind`

Match a tree-sitter node kind directly — use when a pattern can't parse to the node you want (ambiguous syntax, or too many pattern variants to enumerate).

```yaml
rule:
  kind: field_definition
```

**ESQuery-style** (v0.39.1+): `kind: call_expression > identifier` matches an `identifier` child of `call_expression`. Internally converted to a relational `has` rule.

### `regex`

Rust-regex match against node text. Combine with `kind`/`pattern` — pure `regex` is expensive (no AST-kind optimization). Rust syntax, not PCRE: no lookahead/backreferences. Inline flags: `(?i)apple`.

```yaml
rule:
  kind: identifier
  regex: '^(get|set|fetch)[A-Z]'
```

### `nthChild`

Position among named siblings (1-based, CSS-style):

```yaml
rule:
  kind: number
  nthChild: 2          # exact, or An+B: 2n+1
# object form:
  nthChild:
    position: 2n+1
    reverse: false     # count from end
    ofRule:            # filter sibling list first
      kind: function_declaration
```

### `range`

Match by source position — for integrating external tools that emit ranges. `line`/`column` are 0-based, start inclusive, end exclusive.

```yaml
rule:
  range:
    start: { line: 0, column: 0 }
    end:   { line: 1, column: 5 }
```

## Relational rules

Filter the **target** node by its **surrounding** nodes. Form: `target` `relates` to `surrounding`. The relational field's sub-rule matches the surrounding node; the outer rule's other fields match the target.

Four relations:

- `inside` — target is inside a node matching sub-rule
- `has` — target has a child matching sub-rule
- `follows` — target follows (is after) a node matching sub-rule
- `precedes` — target precedes (is before) a node matching sub-rule

```yaml
rule:
  pattern: await $PROMISE
  inside:
    kind: for_in_statement
    stopBy: end
```

### `stopBy`

Controls how far the relation searches. Default `neighbor` (one level).

- `neighbor` — direct neighbour only (default)
- `end` — search until the boundary (root/leaf/first-last sibling)
- `<rule object>` — stop when this rule matches (inclusive: if both hit, it's a match)

```yaml
inside:
  stopBy:
    kind: function       # stop at any enclosing function
  pattern: function test($$$) { $$$ }
```

### `field`

Constrain the relation to a specific AST field (e.g. `key` vs `value` of a `pair`):

```yaml
rule:
  kind: pair
  has:
    field: key
    regex: 'prototype'
```

### Relational sub-rules compose

Sub-rule can be any rule object — atomic, composite, even another relational:

```yaml
rule:
  pattern: await $PROMISE
  inside:
    any:
      - kind: for_in_statement
      - kind: for_statement
      - kind: while_statement
      - kind: do_statement
    stopBy: end
```

## Composite rules

Combine sub-rules with logical operators. Test one node at a time, independently.

- `all: [<rules>]` — node satisfies every rule (guarantees matching order — use when metavariables flow between patterns)
- `any: [<rules>]` — node satisfies at least one rule
- `not: <rule>` — node does not satisfy rule
- `matches: <utility-rule-id>` — node matches the named utility rule (see Utility)

```yaml
rule:
  any:
    - pattern: var $A = $B
    - pattern: const $A = $B
    - pattern: let $A = $B
```

**Field-as-rule shorthand:** a rule object with multiple fields is equivalent to `all` of those fields, but unordered. Use explicit `all` when metavariable capture order matters.

**`all`/`any` operate on rules, not nodes.** `all: [kind: number, kind: string]` matches nothing — one node can't be both. To match a node that has both a number child and a string child:

```yaml
all:
  - has: { kind: number }
  - has: { kind: string }
```

## Utility rules

Reuse rule fragments via `matches: <id>`. Two scopes:

**Local** — defined in `utils:` of the same rule file, scoped to that file:

```yaml
utils:
  is-literal:
    any:
      - kind: 'false'
      - kind: 'null'
      - kind: 'true'
      - kind: number
      - kind: string
rule:
  matches: is-literal
```

**Global** — separate `.yml` file in `utils/` (configured via `utilDirs` in `sgconfig.yml`), available across the project. Must have own `id` and `language`:

```yaml
# utils/is-literal.yml
id: is-literal
language: TypeScript
rule:
  any: [ ... ]
```

**Recursive trick:** a utility can `matches` itself inside its own relational rules (matches dependency cycles are forbidden, but self-reference inside `has`/`inside` is allowed).

## Constraints

Filter matched metavariables after `rule` succeeds. Key is metavar name without `$`; value is a rule. Only single metavariables (`$ARG`), not multi (`$$$ARGS`). Do **not** work inside `not`.

```yaml
rule:
  pattern: console.log($ARG)
constraints:
  ARG:
    kind: identifier       # only match console.log(<identifier>)
```

## Fix

Auto-fix template. String form (textual, not parsed by tree-sitter — metavariables are text-substituted):

```yaml
rule:
  pattern: console.log($$$ARGS)
fix: logger.log($$$ARGS)
# fix: ""   # delete the match
```

Object form (`FixConfig`) for templated rewrites — see [fix reference](https://ast-grep.github.io/reference/yaml/fix.html). Combine with `transform` to manipulate captured text (capitalize, substring, replace) before substituting into `fix`.

## `files` / `ignores`

Glob patterns, relative to `sgconfig.yml`'s directory. Don't prefix with `./`. `ignores` tested before `files`. Respect `.gitignore` by default (CLI `--no-ignore` overrides).

```yaml
files:
  - src/**/*.ts
ignores:
  - '**/*.test.ts'
```

## Test files

Live in `rule-tests/` (configured via `testConfigs` in `sgconfig.yml`). One test file per rule, named `<rule-id>-test.yml`:

```yaml
id: no-await-in-loop       # the rule being tested
valid:
  - for (let a of b) { console.log(a) }
invalid:
  - async function foo() { for (var bar of baz) await bar; }
```

Run `ast-grep test` from project root. Output marks cases: `.` pass, `N` noisy (reported on valid), `M` missing (not reported on invalid). Add `--skip-snapshot-tests` while iterating; run `ast-grep test -U` to generate/refresh snapshots for the diagnostic-span test.

## `sgconfig.yml`

Project root config. Required for `scan` and the LSP.

```yaml
ruleDirs:
  - rules
utilDirs:
  - utils
testConfigs:
  - testDir: rule-tests
    snapshotDir: __snapshots__   # optional, defaults to <testDir>/__snapshots__
languageGlobs:                   # optional, map non-standard extensions to languages
  html: ['*.vue', '*.svelte', '*.astro']
```

All paths resolve relative to `sgconfig.yml`'s location.

## Common pitfalls

- **Rule object is unordered.** `pattern` + `has` in one object may apply in either order. When metavariable capture in `pattern` feeds `has`, wrap in explicit `all:` to force order.
- **`kind` doesn't change `pattern` parsing.** Use pattern object with `context` + `selector` to reparse a pattern as a different node kind.
- **`all`/`any` test one node.** `has: { all: [kind: number, kind: string] }` matches nothing — one child can't be both. Use `all: [has: {kind: number}, has: {kind: string}]`.
- **`fix` is textual, not parsed.** `nonMeta$GREET` substitutes `$GREET` even though the result isn't valid code.
- **`constraints` don't apply inside `not`.** The sub-rule inside `not` is matched before constraints filter, so constraint-keyed metavariables there are unbound.
- **`language` field is capitalized.** `TypeScript`, not `ts`. The lowercase aliases (`ts`, `js`, `cpp`) are for CLI `--lang`, not rule YAML.