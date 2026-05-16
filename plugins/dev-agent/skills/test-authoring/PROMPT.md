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

## Input — all five upstream docs are required

This phase reads **every** upstream doc, not just the AC list. Skipping any of the five produces wrong tests:

- `output/01-grooming.md` — decisions and scope made plain. Tells you which behaviours are in scope to test and which are deferred.
- `output/02-requirements.md` — AC list per UC. **Source of truth for what to assert.**
- `output/03-architecture.md` — **the unit boundaries.** This is where stub / driver seams come from: every cross-component arrow on the architecture diagram is a stub boundary in the tests. Without it, tests collapse into tangled "test everything together" shapes that don't isolate failures.
- `output/04-taskplan.md` — `### T*N*` blocks declare the **test contract** (AC ↔ test method, new vs reuse). This skill fills that contract in; it does not invent its own task split.
- `output/05-techspec.md` — names the test projects, file paths, test-naming overrides, and the concrete interfaces that back each stub.

If any of the five is missing or stale, **stop and surface it** before authoring. Don't reverse-engineer architecture from the AC list; an AC describes *what* must be true, not *where the seams are*.

## Output
- File: `output/06-tests.md` — coverage grouped **per task** from `04-taskplan.md`. Always populated; never "Skipped".
- Actual test code, committed to the target repos in the test projects called out by the tech spec.
- Then rewrite `README.md` to reflect this phase's outcomes.

## Rules

1. **Every `[unit]` and `[integration]` AC in `02-requirements.md` gets at least one failing test.** No silent skips. `[e2e]` AC are deferred to phase 8.
   - **Reuse counts as coverage** — when an AC is already locked down by an existing test on the integration branch (whatever your team's mainline is — `dev`, `develop`, `main`, `trunk`, etc.), the task plan tags it `reuse` and this skill records the file:method + the last-green run. It does NOT skip the AC. "Reuse-heavy" tasks still produce a populated `06-tests.md`.
2. **AC IDs are stable.** Test names cite the AC (`UC<n>_AC<m>_<short_name>`) so phase 7 / 8 can trace tests back to the spec.
3. **Tests must fail for the right reason** — missing method, "not implemented" exception, or assertion-not-met is fine; passing-because-empty is not. Run the suite and record the failure mode per test in `06-tests.md`.
4. **Stubs + drivers — every test isolates exactly one unit.**
   - **What's a unit?** The boundaries set by `output/03-architecture.md`. A unit is one component on the architecture diagram (a handler, a service class, a pure function module, a single state-machine state, etc.). If the architecture says "service A calls service B", then A and B are two units, and A's tests stub B at the interface.
   - **Stub downstreams by interface, drive the unit directly.** Mock / fake / fixture-replace every collaborator the unit talks to. Pass the unit its inputs directly; assert on its outputs and the calls it makes to its stubs. Do NOT spin up the full graph; do NOT exercise B's logic while testing A.
   - **If a unit can't be stub-driven, that's a design smell — surface it, don't write the test against the tangled shape.** Examples that flag a smell: a constructor takes a concrete-class dependency with no interface; a handler does work that can only be exercised by inserting real rows in a real DB; a function reaches into static / global state. Lift these to README `Pending` with a `Q-isolation-<unit>` question; do NOT bend the test to fit the tangle. A test that needs the whole graph spun up is documenting the wrong shape — fix the seam first, then test the slice.
   - **Integration tests** still apply the same rule, just at a coarser unit (a slice that spans 2–3 components on purpose, e.g. handler + repository + real DB). The stubs are still there, just further out (e.g. external HTTP clients stubbed; DB real). Name what's real and what's stubbed in `06-tests.md`.
5. **No production code changes** in this phase except the minimum scaffolding needed for the tests to compile / parse:
   - Stub classes / interfaces / method signatures the tests reference. Body should be a single line that throws the language's idiomatic "not implemented" error (e.g. `throw new NotImplementedException()` in C#, `raise NotImplementedError` in Python, `throw new Error('not implemented')` in TS/JS).
   - No behaviour. No partial implementations. If you find yourself writing logic, stop — it belongs in phase 7.
6. **Test naming** — `UC<n>_AC<m>_<ShortName>_<ExpectedOutcome>`. Match the AC short-name from the requirements doc; if the spec overrides a name, note it in `06-tests.md` and update `05-techspec.md`.
7. **Cross-UC AC references** — when an AC depends on another (e.g. `UC6 AC5` depends on `UC3 AC4`), the test for the dependent AC asserts the dependency hasn't drifted; don't duplicate the upstream assertion.
8. **No reviewer placeholders** in `06-tests.md`. Lift anything needing attention into README's `Reviewer to-do > Pending`.

## Order: spec doc before test code

`06-tests.md` is the **spec** for what phase 7 must satisfy. It is authored **first**, reviewed, and only then does test code get written against it. Concretely:

1. Read the five upstream docs. Build the AC ↔ test ↔ unit-under-test ↔ stub-boundary mapping **on paper** in `06-tests.md`.
2. Get the reviewer to flip 06-tests.md to "approved" (or self-review on solo work) — the seams, the test-name list, the new-vs-reuse split, the stubbed vs real boundary per integration test.
3. Only then author the actual test code against the approved spec.
4. If the test-authoring step surfaces that the spec was wrong (a seam is missing, a unit can't be isolated, an AC is ambiguous), **re-author the spec doc first**, get re-approval, then regenerate the test code. Do NOT silently fix things in code that should have changed in the spec. The spec is authoritative; tests follow it, not the other way around.

## Template for `06-tests.md`

```markdown
# <TASK-KEY> — <feature> · Test Authoring

**Date:** <YYYY-MM-DD>
**Grooming:** `output/01-grooming.md`
**Requirements:** `output/02-requirements.md`
**Architecture:** `output/03-architecture.md`
**Task plan:** `output/04-taskplan.md`
**Tech spec:** `output/05-techspec.md`

## Coverage — per task

### T1 — <task title from 04-taskplan.md>

| AC ID | Tag | Test (file:method) | new/reuse | Fails with / Last green |
|---|---|---|---|---|
| UC1 AC1 | `[unit]` | `…Tests/<FeatureATests>.<ext>:UC1_AC1_<ShortName>_<ExpectedOutcome>` | new | not-implemented error |
| UC1 AC2 | `[integration]` | `…Tests/<FeatureATests>.<ext>:UC1_AC2_<ShortName>_<ExpectedOutcome>` | new | not-implemented error |
| UC3 AC1 | `[unit]` | `…Tests/<FeatureBTests>.<ext>:UC3_AC1_<ShortName>_<ExpectedOutcome>` | reuse | green on the integration branch 2026-05-12 |

#### Stub / driver plan
One row per test in the table above. Drawn from `output/03-architecture.md`.

| Test method | Unit-under-test | Drives (input) | Stubs (collaborators replaced) | Asserts (observable outcome) |
|---|---|---|---|---|
| `UC1_AC1_…` | <component on architecture diagram> | <input shape passed directly to the unit> | <interfaces faked + the calls asserted on them> | <return value + stub-call assertions> |

For `[integration]` tests, name explicitly what is **real** (DB, in-process bus) vs **stubbed** (external HTTP clients, third-party SDKs) — there's no "everything real" integration test in this scheme; pick the seam.

### T2 — …

(one section per T*N* in `04-taskplan.md`. Empty section = task not yet at phase 6.)

## Deferred to phase 8 (E2E)

| AC ID | Owning task | Reason |
|---|---|---|
| UC4 AC1 | T3 | `[e2e]` — UI rendering, requires browser |

## Scaffolding stubs added

- `<path>` — signature only; body throws the language's idiomatic "not implemented" error.

## Suite run

- Command: `<your test runner — e.g. dotnet test, pytest, npm test, go test, cargo test>`
- Result: <N> new tests authored, all failing for the expected reason. <M> reuse tests confirmed green on the integration branch.

## Contract check

- AC accounted for: <X> = `[unit]` + `[integration]` + `[e2e]` in `02-requirements.md` UC↔AC index.
- Tasks accounted for: every T*N* in `04-taskplan.md` has a section above (or is explicitly marked "no test work" with a one-line reason — e.g. pure SQL deploy task).
```

## Step 1 — Author `06-tests.md` (the spec)

Before any code: write the full `06-tests.md` from the upstream docs.

1. Open `output/04-taskplan.md`. For each `### T*N*` block, read its **Test contract** table.
2. The contract names AC IDs, tags (`new`/`reuse`), and target test methods. This skill **fills the contract in**; it does not re-derive coverage from `02-requirements.md` (that's the task plan's job).
3. If a contract row is missing an AC that `02-requirements.md` lists as `[unit]` / `[integration]`, that's a gap — lift to README `Pending` and stop. Do NOT silently invent coverage; the task plan owns the split.
4. **For each row, name the unit-under-test and its stub boundaries.** Cross-reference `output/03-architecture.md`: which component is being driven, what does it call, which calls become stubs in this test? Record one line per test:
   `unit: <component on architecture diagram> · drives: <input shape> · stubs: <collaborators replaced> · asserts: <observable outcome of this AC>`
5. For each `new` row: declare a failing test (file, class, method, fails-with). For each `reuse` row: confirm the named test exists and is green on the integration branch; capture the run.
6. `[e2e]` rows in the contract are deferred to phase 8 — record them in the "Deferred" section but do not author here.
7. Surface the spec for reviewer approval. **Do not proceed to step 2 until it lands.** If the reviewer asks for changes, re-author `06-tests.md`; do NOT branch into code that will need to be redone.

## Step 2 — Author the tests against the approved spec

For each row in the approved `06-tests.md`:

- File: in the test project called out by the tech spec (or the nearest conventional one if vague).
- Class: group by UC (`UC<n>Tests`) unless the tech spec says otherwise.
- Method: `UC<n>_AC<m>_<ShortName>_<ExpectedOutcome>`.
- Body: Arrange / Act / Assert.
  - **Arrange** the unit-under-test with its stubbed collaborators (per the boundary you recorded in step 1.4). Use real-looking fixture inputs.
  - **Act** by calling the unit directly — no orchestration, no full graph, no integration scaffolding beyond what the AC's tag demands.
  - **Assert** the specific behaviour from the AC. Assert on the unit's output AND on the calls it made to its stubs (e.g. "downstream client was called once with payload X"). No tautologies.
- Add stub classes / methods / interfaces just enough for the suite to compile.
- **If authoring surfaces that the spec was wrong** (the unit can't be cleanly driven, a stub boundary doesn't exist on the production side, an AC is ambiguous): stop. Update `06-tests.md` first, get re-approval, then continue.

## Step 3 — Run the suite, finalize `06-tests.md`, update README

- Run the full suite. Capture the failure mode per test.
- Fill the template above. Counts must equal the requirements index.
- Rewrite `README.md`:
  - Update Progress row 6 to `Done`.
  - Lift to `Pending`: any AC you couldn't author a test for (with reason), any test-name deviation from the convention, any scaffolding that crossed into behaviour.

## Step 4 — Exit gate

Phase 7 (Implementation) MUST NOT start until:

- The `06-tests.md` spec doc (including the stub / driver plan per test) is approved before any test code was written.
- The suite runs end-to-end and every new test fails for the expected reason.
- AC coverage in `06-tests.md` matches the `[unit]` + `[integration]` rows in the requirements UC↔AC index.
- Every authored test isolates exactly one unit (per the seams in `03-architecture.md`); no test silently spins up the full graph to compensate for a missing stub boundary.
- Reviewer questions raised in this phase are resolved.

## Git workflow

Same per-repo branch strategy as `skills/implementation.md`. Test authoring lands on the feature branch phase 7 will continue on. Commit message prefix: `test: <task-id> add failing tests for UC<n>…`.
