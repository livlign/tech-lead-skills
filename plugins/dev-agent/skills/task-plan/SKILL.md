---
name: task-plan
description: Break work into shippable tasks with test plan and deploy plan.
---

# Task Plan

## Audience rule

The plan is read by stakeholders across the team — engineering and non-engineering alike. Each task says **what changes for the user** and **how we'll know it works** in plain language. Repo names are fine; class/file/SQL names belong in `output/.refs/<topic>.md` or in step 5 (Tech Spec).

## Input

`output/02-requirements.md`, `output/03-architecture.md` (if it ran).

## Step 0 — granularity

Ask the reviewer once:

> Ticket granularity — `Human` (fine-grained, 0.25–1d each) or `AI` (coarse, ≤ 8 shippable slices)?

Default `AI`. Record at top of the doc.

## Do

For each task:
- Cite the use case(s) it serves (UC1, UC2…).
- **List the AC IDs the task covers** (`UC<n> AC<m>` from `02-requirements.md`). Each in-scope `[unit]` / `[integration]` / `[e2e]` AC must appear under exactly one task. No orphan ACs, no AC under two tasks.
- **Declare the test contract**: for each AC the task covers, name the test method that will assert it (`UC<n>_AC<m>_<ShortName>_<ExpectedOutcome>`), tag it `new` or `reuse`, and point at the file. Phase 6 fills in failing tests against this contract; Phase 7 must not break it.
- State its deploy plan: which repos merge, which CI jobs / pipelines rebuild, any SQL / config / feature flags.

Every task is **isolated, testable, and deployable on its own**. A task whose AC list is empty is not a task — fold it into another or drop it.

## Output — `output/04-taskplan.md`

Template:

```markdown
# <TICKET> — Task Plan

**Granularity:** Human | AI

## Tasks

### T1 — <imperative title>
- **Use cases:** UC1, UC3
- **Repos:** <repo1>, <repo2>
- **AC covered:** UC1 AC1, UC1 AC2, UC3 AC1
- **Test contract:**
  | AC | Tag | Test (file:method) | new/reuse |
  |----|-----|---------------------|-----------|
  | UC1 AC1 | `[unit]` | `…Tests/<FeatureATests>.<ext>:UC1_AC1_<ShortName>_<ExpectedOutcome>` | new |
  | UC1 AC2 | `[integration]` | `…Tests/<FeatureATests>.<ext>:UC1_AC2_<ShortName>_<ExpectedOutcome>` | new |
  | UC3 AC1 | `[unit]` | `…Tests/<FeatureBTests>.<ext>:UC3_AC1_<ShortName>_<ExpectedOutcome>` | reuse (green on integration branch) |
- **Deploy plan:**
  - PRs to merge: <repo1 → dev, repo2 → dev>
  - CI jobs / pipelines: <job or pipeline paths>
  - SQL / config: <scripts or "none">
- **Depends on:** —

### T2 — …

## Coverage
- Use cases covered: UC1, UC2, UC3
- Use cases uncovered: <none> or <list + reason>

## Ticket-tracker plan
The ticket tracker (Jira, Linear, GitHub Projects, Azure Boards, etc.) is configured per workspace in `CLAUDE.md` / `AGENTS.md`. Fill in:
- **Project / board:** <key or name> · **Type:** <Story / Task / Issue>
- **Title format:** `[<tag>] <TICKET> <feature> - <desc> - <BE|FE>`
- **Parent / epic:** new (proposed: <title>) | existing (key: <…>) | _ask reviewer_
- **Children:** one row per task with its final title.
```

## After writing

Rewrite `README.md`. Lift to `Pending`: epic choice, any uncovered use case, any task where BE/FE split is genuinely unclear.

Do **not** create tickets in the tracker until the reviewer approves the parent / epic choice. When the tracker exposes an MCP server or API, the typical order is: list visible projects → search for the chosen parent → create child issues → link children to the parent. When no automation is available, hand the table to the reviewer to create manually.
