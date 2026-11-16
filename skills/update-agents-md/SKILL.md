---
name: update-agents-md
description: Maintain AGENTS.md or CLAUDE.md when correcting stale guidance, recording a verified recurring workflow pitfall absent from ordinary repository sources, or explicitly auditing agent instructions. Routine task completion is not a trigger.
---

# Update AGENTS.md

AGENTS.md and CLAUDE.md guide future agents' behavior. They are not implementation documentation or session logs. Leaving them unchanged is a successful outcome; there is no per-task note quota.

## Admission gate

Before adding a note, answer all three:

1. **Behavioral:** What specific action should a future agent take differently?
2. **Non-duplicative:** Why would reading the owning code, tests, scripts, configuration, or existing documentation not reveal this?
3. **Durable:** What evidence makes this a recurring repository pitfall rather than a task-specific observation?

If any answer is missing, make no addition. A new dependency, command, config edit, or implementation decision does not qualify by itself. An explicit request to audit guidance authorizes the audit, not arbitrary additions.

## Edit workflow

1. Read the existing guidance and the candidate's owning source. Check for an existing rule before adding one.
2. Correct or remove stale and redundant guidance in place. A correction does not need to introduce a new pitfall; preserve only guidance that passes the admission gate.
3. For an admitted addition, write the smallest actionable rule with its trigger. Match the file's bullet style and keep one idea per bullet.
4. Put implementation details in their owning code, operational docs, or architectural docs. If no documentation change is needed, leave them in the code and tests. Creating `docs/agents/` does not make unsuitable content suitable.
5. Review the final diff: every retained addition must change future agent behavior, add otherwise-unavailable knowledge, and remain useful beyond this task. Remove additions that fail this check.

## Examples

| Candidate | Outcome |
|-----------|---------|
| A verified shared test database is not isolated, and parallel runs corrupt fixtures; no existing guidance reveals this | Add: "Run these integration suites serially; they share fixture state." |
| An existing instruction names a retired workflow | Correct or remove it; do not append a history of the migration. |
| "The failure counter now has `reason` and `custom_template` tags" | No agent-guidance edit. The metric implementation or operational docs owns this. |
| "Field X is copied from result Y", "function Z now handles fallback", or "we added dependency Q" | No agent-guidance edit. Code, tests, or package configuration already records it. |
| "Preprod was slow today" or "this task passed 26 tests" | No agent-guidance edit. Report task-specific observations in the task response. |
| A domain invariant or architectural decision | Record in the existing domain or architectural docs when needed; admit an agent-facing rule only if it separately passes the gate. |

## Organizing admitted guidance

Keep AGENTS.md an index. If an admitted guidance section grows beyond about 50 lines, use an existing focused agent document or extract one and add a trigger-bearing pointer. Prune unsuitable content before moving it. Prefer existing repository paths over inventing a documentation taxonomy.

Update guidance after the work is verified so it reflects the final workflow. Preserve valid links, and remove orphaned pointers when deleting obsolete documents. Subagents pass candidate guidance changes to the parent instead of editing these files themselves.
