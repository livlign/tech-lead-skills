---
name: implementation
description: Write production code until the failing tests from Phase 6 (Test Authoring) pass.
---

# Skill — Implementation

Make the failing tests from Phase 6 (Test Authoring) pass with the minimum production code the tech spec allows. Do NOT write new tests here — if the spec shifted and a new test is needed, pause, update `output/06-tests.md` in the Phase 6 format, and then return.

**One task per turn. Hard stop after each task** — commit, write the task's section into `output/07-impl.md`, mark it `Waiting review` in README, and **return control**. Do not start T*N+1* until the reviewer says go. Phase 7 is the gate that enforces "AI codes → human reviews → next task"; bundling tasks defeats it.

Inside a single task, stop only on a build break you can't resolve, a contract-flipping decision (lift to README Pending), or a destructive op. Otherwise auto-proceed to the end of that task — then stop.

## Input
- `output/06-tests.md` — the failing-test inventory that defines "done" for this phase.
- `output/05-techspec.md` — concrete file / DB / API changes.
- `output/02-requirements.md` — `UC<n> AC<m>` IDs are the acceptance contract.

## Output
- File: `output/07-impl.md` in the task folder.
- Then rewrite `README.md` to reflect this phase's outcomes and refresh the Progress table.

## Entry gate

Phase 7 must not start until Phase 6's suite runs and every `new` test in `06-tests.md` fails for the expected reason. If any test passes before implementation, it's wrong — fix it in Phase 6 first.

## Per-turn protocol — one task only

1. Look at the Progress table in `README.md` and the per-task sections in `07-impl.md`. Find the lowest-numbered task whose status is `Todo` or `In Progress` (NOT `Done` / `Waiting review`). Call it **T*K***.
2. If the previous task (T*K-1*) is `Waiting review`, **stop**. Do not start T*K* until the reviewer flips T*K-1* to `Done` (or asks for a patch on it).
3. **The locked-spec rule.** Before touching code, run the full suite. Every test for every already-`Done` task must still be green. If anything is red, that's a regression introduced by this task's predecessor — stop and surface it; do not "fix forward".
4. Implement T*K* against its **Test contract** in `04-taskplan.md`. Make those AC's tests green. Don't touch code outside T*K*'s declared repos / files.
5. Run the full suite again. T*K*'s tests must be green. All prior `Done` tasks' tests must still be green. If a prior task's test legitimately needs to change because of T*K*, **stop** — lift to README `Pending` and wait for reviewer confirm. Do NOT edit a locked test silently.
6. Commit per the Git workflow below (one logical commit per repo touched). Do NOT push unless the reviewer has previously authorized push for this task.
7. Append a `## T*K*` section to `07-impl.md` (template below). Flip the Progress row for T*K* in README to `Waiting review`.
8. **Return control.** Do not proceed to T*K+1*.

## Implementation rules (within a single task)

- Strictly per tech spec. No scope creep.
- Minimal, readable. No dead code. No comments on self-explanatory code.
- Touch only files identified in grooming / tech spec / test authoring scaffolding for THIS task.
- Do NOT modify Phase 6 test files to make them pass. If a test is wrong, loop back to Phase 6, amend `06-tests.md`, and re-run.
- Run the suite after every meaningful chunk. Record which `UC<n> AC<m>` IDs flipped from red to green.

## Output doc — `output/07-impl.md`

The doc grows **one task at a time**. Append a `## T*K*` section per turn; never pre-populate sections for tasks that haven't run.

```markdown
# <TASK-KEY> — <feature> · Implementation

**Tests:** `output/06-tests.md`
**Tech spec:** `output/05-techspec.md`
**Task plan:** `output/04-taskplan.md`

---

## T1 — <task title> · Waiting review

**Completed:** <YYYY-MM-DD>
**Commit(s):** <repo>@<sha> [, <repo>@<sha>]
**Reviewer status:** Waiting review

### Files changed
- <path> — <one-line summary>

### Key logic
- <short prose covering non-obvious decisions>

### Test verdicts (this task's contract)
| AC ID | Test name | File | Verdict |
|---|---|---|---|
| UC1 AC2 | <test name> | `<test file>` | Pass (new) |
| UC3 AC1 | <test name> | `<test file>` | Pass (reuse) |

### Locked-spec check (prior tasks)
- Suite run: <N> tests, all green. No prior `Done` task's tests regressed.

### Deviations from tech spec
- <if any — include why and whether the spec should be updated>

### Open items for reviewer
- <if any>

---

## T2 — … (only appended after reviewer flips T1 to Done)
```

## Rules

- No line-by-line review in this phase — that's gone. Correctness is enforced by the Phase 6 tests.
- Do NOT add `**Reviewer:**` placeholders in `output/07-impl.md`. Lift open items, deviations from the tech spec, deferred tests with reviewer-visible impact, and any decision that crossed scope into README's `Reviewer to-do > Pending`.

## Git workflow

The agent must follow **the team's existing git flow** — do not improvise. Configure the specifics for your team in the workspace's `CLAUDE.md` / `AGENTS.md`; below is a sane default for teams that don't have one yet.

### Default flow (override per team)

- **Base branch:** cut feature branches from the team's integration branch (typically `main` / `master` / `dev` — check `CLAUDE.md`). Always start with `git checkout <base> && git pull`.
- **Branch name:** `<scope>/<TICKET-KEY>/<short-slug>` — e.g. `feat/PROJ-1234/sample-logic`. Match existing naming if there's a clear convention in `git log`.
- **Commits:** stage specific files only (`git add <path>`, never `-A` / `.`). One logical commit per repo touched is preferred. Never `--no-verify`.
- **Push:** only after the reviewer has explicitly authorized push for this task. `git push -u origin HEAD` on first push.
- **PR target:** open PRs against the team's integration branch (often `dev` or `main`).
- **Never** use `--force` or `--force-with-lease` without explicit, per-operation user approval. Treat both as equivalent for authorization.
- **Never** rebase or merge the integration branch into the feature branch. The branch stays based on its cut point; the PR merge handles integration.

### Code-style guardrails (apply across languages)

- Self-explanatory code over narrative comments. Public-API contracts may carry tight doc comments when the semantics are non-obvious (throws-on-X, absent-from-result, per-mode behaviour); keep them short. `// TODO(<TICKET-KEY>): …` one-liners are OK; multi-line explainer blocks under a TODO are not. Never commit commented-out code.
- SQL scripts: no `-- <ticket>` / `-- summary` headers (file name + path already identify the script). Use transactions only for multi-statement DML that must atomically succeed or fail together — not around a single idempotent DDL statement (an `IF NOT EXISTS` guard makes it re-runnable, and most engines run DDL in an implicit transaction).

### Shared-state guardrails

- **Never DELETE shared data without explicit per-row authorization.** This includes `DELETE`, `DROP`, `TRUNCATE`, and any cleanup statement against shared databases, configuration tables, lookup tables, or anything multi-ticket. A row that looks orphan or leftover from your own work may belong to another ticket or team. Apparent-orphan cleanup is destructive on shared state — even if the value was "obviously yours" earlier in the same session. If a rename / migration leaves an old row behind, surface it explicitly to the reviewer and ask whether to drop it; do not silently add a `DELETE` to the next data script.
- **Verify shared registries before mutating them.** Source-controlled scripts are NOT a complete picture of a live shared registry / config table — rows are often seeded outside source control. Before picking a new id or reusing one, either confirm against the team's source-of-truth (tracking sheet, internal wiki, prod query) or ask the reviewer to confirm. Source-control scripts alone are NOT sufficient evidence.

### PR target

`gh pr create` works on GitHub-hosted repos. If your repo is on Bitbucket Cloud, GitLab, or another forge, configure the PR command in `CLAUDE.md` / `AGENTS.md` — examples:

- Bitbucket Cloud: ask the user to click a pre-filled PR URL, or call the REST API `POST /2.0/repositories/{workspace}/{repo}/pullrequests` with an app password.
- GitLab: `glab mr create`.

**PR title / body:** title <70 chars, include the ticket key (e.g. `<TICKET-KEY>: <short summary>`). Body: short slice summary, link to `output/07-impl.md`.

Record the created PR URLs in `output/07-impl.md` and bump the `STATUS.md` row.

## Deployment runbook (when Phase 7 closes)

When the implementation phase has shipped all sub-tasks across all repos, author `DEPLOY.md` in the task folder per the spec in `AGENT.md` → `DEPLOY.md` section. Link it from `README.md`'s top-of-file note.

If your team uses a CI / CD config (Jenkins jobs, GitHub Actions workflows, GitLab pipelines, CircleCI, Buildkite, etc.), scan that config to identify the precise rebuild list — match on source-path substrings against each touched repo, not on top-level repo declarations alone (those define what the build clones, not what it compiles).
