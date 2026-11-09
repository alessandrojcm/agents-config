---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Before writing each piece of code or test, find its precedent: the existing helper or pattern that already does this job, the existing tests for the unit you're changing, and the directory or domain that owns the change. Start from the precedents the ticket or spec names; search the codebase (`AGENTS.md`, `CONTEXT-MAP.md`, the layout, neighbouring code) only for what they leave uncovered. Extend what's there and place new files beside their siblings.

Keep a **precedent list** as you go: one line per new function, type, test, and file, naming the precedent it follows (module/symbol or path), or "none — <reason>". **Completion criterion:** every new function, type, test, and file is on the list.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work, handing it the precedent list.

Commit your work to the current branch.
