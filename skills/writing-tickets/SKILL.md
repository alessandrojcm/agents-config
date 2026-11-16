---
name: writing-tickets
description: Write tickets a cold reader can follow without the conversation, glossary or code behind them. Use when drafting or rewriting a Jira ticket, spike or issue description.
---

# Writing tickets

Write every ticket for a **cold reader**: a teammate from another team, or you in three months. They have only the ticket. They never saw the conversation, the project's `CONTEXT.md`, the code you read or the analysis you ran.

## Steps

### 1. Collect the substance

List what the ticket must carry: the question or outcome, why it matters (with the numbers and their source), the decisions already made, the work, how we know it's done, and what's deliberately left out. Restate each decision as a fact about the work: "Scenarios run on a preprod test account", not "per Q19".

If the tracker has precedents (earlier spikes or stories in the same project), follow their section shape.

**Done when** every agreed decision and scope boundary from the conversation appears in the list.

### 2. Draft in this order

Use these sections, dropping any that don't apply:

1. **Question** (spike) or **Goal** (story): one or two sentences in plain words about what we want to know or have.
2. **Why**: the problem, told as what happens. Give each figure its date range and a link to its source. Say what is confirmed and what isn't.
3. **Approach**: the decisions, each one a short bullet. Split long bullets into sub-bullets.
4. **Work**: numbered steps, each one an action with a visible result.
5. **Acceptance criteria**: checkable statements an outsider could verify.
6. **Out of scope**: one item per line.
7. **Timebox** for a spike.

### 3. Run the cold-reader pass

Go through the draft sentence by sentence and mark every term the cold reader can't decode: words coined in the conversation, `CONTEXT.md` glossary terms, internal abbreviations, code names and question numbers. For each one:

- **Describe it instead**, using the thing it names: "the email as the user first sees it in the editor", not "Pushed Copy".
- **Or define it where it first appears**, if the reader will meet it in code or later tickets: "a label on each AI-written block (in code we call this a copy origin)". Use that one name from then on.
- **Explain mechanisms by what happens**: "the editor gives every block a new random ID each time an email is opened", not "IDs are editor keys, not lineage".
- **Anchor abstractions with an example**: "the name of the template placeholder the AI filled, such as `BODY`".
- **Name each outcome once and keep it**: if the results are kept, edited and deleted, use those three words everywhere.
- **Keep code identifiers that an engineer needs to find**, and say in words what each one does.

Then apply the `deslopifier` skill to the prose.

**Done when** every marked term has been replaced or defined at first use, and someone who reads only the ticket could explain back what will be done and how we'll know it worked.

### 4. Show the draft, then publish

Show the full draft to the user before you create or edit anything in the tracker, and apply their changes. After publishing, read the ticket back from the tracker and compare its text with the approved draft.
