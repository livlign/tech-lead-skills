# test-authoring

> Turn each [unit] / [integration] AC into a failing test before implementation. The test suite becomes the executable spec phase 7 must satisfy.

<!--
Portable prompt. Use as a system prompt, Cursor rule, Windsurf rule, Aider convention,
custom-GPT instructions, or paste-into-chat block. Generated from SKILL.md
- do not edit directly. Source: https://github.com/livlign/tech-lead-skills
-->

---
# Skill — Test Authoring

**Purpose:** Walk the AC list in `output/02-requirements.md`, filter to `[unit]` and `[integration]`, and emit one failing test per AC before any production code is written. The suite becomes the executable spec that phase 7 (Implementation) must make pass.

## Input
- `output/02-requirements.md` — AC list per UC. **Source of truth for this phase.**
- `output/04-taskplan.md` — `### T*N*` blocks declare the **test contract** (AC ↔ test method, new vs reuse). This skill fills that contract in; it does not invent its own task split.
- `output/05-techspec.md` — names the test projects, file paths, and any test-naming overrides.

## Output
- File: `output/06-tests.md` — coverage grouped **per task** from `04-taskplan.md`. Always populated; never "Skipped".
- Actual test code, committed to the target repos in the test projects called out by the tech spec.
- Then rewrite `README.md` to reflect this phase's outcomes.

## Rules

1. **Every `[unit]` and `[integration]` AC in `02-requirements.md` gets at least one failing test.** No silent skips. `[e2e]` AC are deferred to phase 8.
   - **Reuse counts as coverage** — when an AC is already locked down by an existing test on `dev`, the task plan tags it `reuse` and this skill records the file:method + the last-green run. It does NOT skip the AC. "Reuse-heavy" tasks still produce a populated `06-tests.md`.
2. **AC IDs are stable.** Test names cite the AC (`UC<n>_AC<m>_<short_name>`) so phase 7 / 8 can trace tests back to the spec.
3. **Tests must fail for the right reason** — missing method / `NotImplementedException` is fine; passing-because-empty is not. Run the suite and record the failure mode per test in `06-tests.md`.
4. **No production code changes** in this phase except the minimum scaffolding needed for the tests to compile:
   - Stub classes / interfaces / method signatures the tests reference. Body is `throw new NotImplementedException()`.
   - No behaviour. No partial implementations. If you find yourself writing logic, stop — it belongs in phase 7.
5. **Test naming** — `UC<n>_AC<m>_<ShortName>_<ExpectedOutcome>`. Match the AC short-name from the requirements doc; if the spec overrides a name, note it in `06-tests.md` and update `05-techspec.md`.
6. **Cross-UC AC references** — when an AC depends on another (e.g. `UC6 AC5` depends on `UC3 AC4`), the test for the dependent AC asserts the dependency hasn't drifted; don't duplicate the upstream assertion.
7. **No reviewer placeholders** in `06-tests.md`. Lift anything needing attention into README's `Reviewer to-do > Pending`.

## Template for `06-tests.md`

```markdown
# <TASK-KEY> — <feature> · Test Authoring

**Date:** <YYYY-MM-DD>
**Tech spec:** `output/05-techspec.md`
**Requirements:** `output/02-requirements.md`
**Task plan:** `output/04-taskplan.md`

## Coverage — per task

### T1 — <task title from 04-taskplan.md>

| AC ID | Tag | Test (file:method) | new/reuse | Fails with / Last green |
|---|---|---|---|---|
| UC1 AC1 | `[unit]` | `…Tests/SampleSettingsTests.cs:UC1_AC1_LoadDefaults_WhenStudioFresh_ReturnsOffOff` | new | NotImplementedException |
| UC1 AC2 | `[integration]` | `…Tests/SampleSettingsTests.cs:UC1_AC2_SavePersists_WhenAdminSaves_NewValuePersistedStudioWide` | new | NotImplementedException |
| UC3 AC1 | `[unit]` | `…Tests/StatusTagTests.cs:UC3_AC1_SampleStatusTag_WhenRendered_ShowsOneOfThreeValues` | reuse | green on `dev` 2026-05-12 |

### T2 — …

(one section per T*N* in `04-taskplan.md`. Empty section = task not yet at phase 6.)

## Deferred to phase 8 (E2E)

| AC ID | Owning task | Reason |
|---|---|---|
| UC4 AC1 | T3 | `[e2e]` — UI rendering, requires browser |

## Scaffolding stubs added

- `<path>` — signature only; body `throw new NotImplementedException()`

## Suite run

- Command: `dotnet test <solution>`
- Result: <N> new tests authored, all failing for the expected reason. <M> reuse tests confirmed green on `dev`.

## Contract check

- AC accounted for: <X> = `[unit]` + `[integration]` + `[e2e]` in `02-requirements.md` UC↔AC index.
- Tasks accounted for: every T*N* in `04-taskplan.md` has a section above (or is explicitly marked "no test work" with a one-line reason — e.g. pure SQL deploy task).
```

## Step 1 — Walk the task plan, not the AC list directly

1. Open `output/04-taskplan.md`. For each `### T*N*` block, read its **Test contract** table.
2. The contract names AC IDs, tags (`new`/`reuse`), and target test methods. This skill **fills the contract in**; it does not re-derive coverage from `02-requirements.md` (that's the task plan's job).
3. If a contract row is missing an AC that `02-requirements.md` lists as `[unit]` / `[integration]`, that's a gap — lift to README `Pending` and stop. Do NOT silently invent coverage; the task plan owns the split.
4. For each `new` row: author a failing test. For each `reuse` row: confirm the named test exists and is green on `dev`; capture the run.
5. `[e2e]` rows in the contract are deferred to phase 8 — record them in the "Deferred" section but do not author here.

## Step 2 — Author the tests

For each AC:

- File: in the test project called out by the tech spec (or the nearest conventional one if vague).
- Class: group by UC (`UC<n>Tests`) unless the tech spec says otherwise.
- Method: `UC<n>_AC<m>_<ShortName>_<ExpectedOutcome>`.
- Body: Arrange / Act / Assert.
  - Arrange with real-looking fixtures where cheap; otherwise mark `TODO(Phase 7 fixture)` and record in `06-tests.md`.
  - Assert the specific behaviour from the AC. No tautologies.
- Add stub classes / methods / interfaces just enough for the suite to compile.

## Step 3 — Run the suite, write `06-tests.md`, update README

- Run the full suite. Capture the failure mode per test.
- Fill the template above. Counts must equal the requirements index.
- Rewrite `README.md`:
  - Update Progress row 6 to `Done`.
  - Lift to `Pending`: any AC you couldn't author a test for (with reason), any test-name deviation from the convention, any scaffolding that crossed into behaviour.

## Step 4 — Exit gate

Phase 7 (Implementation) MUST NOT start until:

- The suite runs end-to-end and every new test fails for the expected reason.
- AC coverage in `06-tests.md` matches the `[unit]` + `[integration]` rows in the requirements UC↔AC index.
- Reviewer questions raised in this phase are resolved.

## Git workflow

Same per-repo branch strategy as `skills/implementation.md`. Test authoring lands on the feature branch phase 7 will continue on. Commit message prefix: `test: <task-id> add failing tests for UC<n>…`.
