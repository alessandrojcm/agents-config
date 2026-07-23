---
name: parallelize-tickets
description: Run an implementation ticket graph in parallel through herdr worktrees, continuously dispatching the unblocked frontier until every ticket is integrated.
disable-model-invocation: true
---

# Parallelize Tickets

Treat the tickets as a **DAG** and keep its **frontier** saturated: every open ticket whose blockers are complete gets its own herdr worktree and `/implement` agent. Integrate completed branches, then immediately dispatch the frontier those merges unlock.

## 1. Load the DAG

Confirm `HERDR_ENV=1`; otherwise stop and ask the user to run this skill inside herdr.

Use the ticket source the user named. Otherwise, read the repo's configured tracker from `docs/agents/issue-tracker.md` when present and reachable; fall back to `tickets.md`. Fetch every candidate ticket's title, body, acceptance criteria, state, and blocking edges.

Build one ledger containing each ticket's stable identifier, blockers, state, branch, worktree workspace, pane, agent, and resulting commit. Treat a missing, ambiguous, or cyclic blocking edge as unresolved and ask the user to repair the DAG.

This step is complete when every open ticket is in the ledger and the frontier can be computed without guessing.

## 2. Claim the frontier

The frontier is every open, unclaimed ticket whose blockers are complete. Claim all frontier tickets in the source before dispatching them. Use the configured tracker's claim operation; for `tickets.md`, add `**Status:** in progress — <branch>` beneath each claimed ticket heading in the coordinator worktree only and commit that source-state update before creating the worktrees.

Use deterministic names derived from the ticket identifier and title:

- branch: `ticket/<id>-<slug>`
- worktree label: `<id> <short title>`
- agent: `ticket-<id>-<slug>`, shortened to herdr's 32-character limit

This step is complete when every ticket about to run has one visible claim and no ticket is assigned twice.

## 3. Dispatch one worktree per ticket

Re-read current herdr IDs before each dispatch because IDs compact. For each claimed frontier ticket:

1. Create a worktree from the coordinator's current integration `HEAD`, without focusing it:

   ```bash
   herdr worktree create --cwd <repo-root> --branch <branch> --base <integration-HEAD> --label <label> --no-focus
   ```

2. Parse `result.workspace.workspace_id` and `result.root_pane.pane_id` from the response into the ledger.
3. Start opencode in that root pane:

   ```bash
   herdr agent start <agent> --kind opencode --pane <pane-id>
   ```

4. Prompt it with `herdr agent prompt <agent> <prompt>`. Include the exact ticket title, body, acceptance criteria, source reference, and this contract:

   ```text
   Invoke /implement for this ticket only. Its blockers are already integrated.
   Work only in this worktree. Run the ticket's checks, review the result, and commit it.
   Return control to the coordinator for merging and ticket-state updates; implement no other ticket.
   Finish with the commit hash, checks run, and any residual risk or blocker.
   ```

This step is complete when every claimed frontier ticket has one live agent in its own worktree and the ledger records all returned IDs.

## 4. Run the conveyor

Repeat until the ledger has no open ticket:

1. Inspect `herdr agent list` and read each newly `done` or `blocked` agent.
2. For a completed agent, require a commit and its reported checks. In the coordinator worktree, inspect the branch and merge it into the integration branch one at a time. Run the repo's required integration checks after the merge.
3. Only after a clean merge and passing checks, mark the source ticket complete. For `tickets.md`, replace its status with `**Status:** done — <commit>`, check its acceptance criteria in the coordinator worktree, and commit the source-state update.
4. Remove the finished checkout with `herdr worktree remove --workspace <current-workspace-id>`; this removes the worktree, not its branch.
5. Refresh ticket states and blocking edges from the source, recompute the frontier, then claim and dispatch every newly unblocked ticket using steps 2–3. New worktrees always branch from the latest integrated `HEAD`.
6. When agents are still working and no state changed, run `herdr agent wait <agent> --until done --timeout <sized-ms>` for a running agent, then inspect all agents again. A timeout triggers an agent read and diagnosis rather than a blind retry.

Keep independent agents running while one result is being integrated. A blocked agent leaves its ticket claimed: read its exact blocker, continue unaffected tickets, and ask the user for the missing decision or environmental fix. A merge or verification failure leaves the worktree intact and the ticket incomplete; report the failing command and key error before asking how to proceed.

If open tickets remain but the frontier is empty and no agent is running, report the unresolved blocking chain; the conveyor is deadlocked, not complete.

This step is complete only when every ticket is merged, verified, marked complete at the source, and every ticket worktree has been removed.

## 5. Report the integrated graph

Report tickets in dependency order with branch, commit, and verification result. Include any branches intentionally retained and the reason.

This step is complete when the report accounts for every ticket from the original ledger and any tickets discovered from the tracker during execution.
