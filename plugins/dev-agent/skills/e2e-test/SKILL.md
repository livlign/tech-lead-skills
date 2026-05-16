---
name: e2e-test
description: End-to-end testing of the whole flow against requirements. Walks the [e2e]-tagged AC list.
---

# Skill — E2E Test

**Purpose:** Prove the feature works end-to-end, top to bottom, against the requirements. Not a line-by-line code review — a user-level verification of the shipped flow, driven by the `[e2e]`-tagged AC in `02-requirements.md`.

## Input
- `output/02-requirements.md` — `[e2e]`-tagged AC are the acceptance contract. Cross-UC references (e.g. `UC6 AC5` → `UC3 AC4`) drive cross-flow scenarios.
- `output/07-impl.md` — the implementation record (what was built, where).
- Running environments (local / dev) needed to exercise the flow.

## Output
- File: `output/08-e2e.md` in the task folder.
- Then rewrite `README.md` to reflect this phase's outcomes.

## What to test

Walk the requirements doc UC by UC and exercise every `[e2e]`-tagged AC:

- **Per-UC happy path** for each UC's `[e2e]` AC — does the golden scenario complete?
- **Edge cases** carried as `[e2e]` AC (cancels, empty inputs, validation failures, hidden-because-no-add-on).
- **Cross-flow scenarios** — sequences traversing multiple UCs (e.g. UC1 toggle off → UC2 import lands no Sample → UC6 scan creates Sample → UC3 status advances).
- **Add-on gating regressions** — UC8 AC7 (every Product Hub surface hidden when UI add-on is OFF) and equivalents must be exercised on every new surface.

## Output structure

```markdown
# <TASK-KEY> — <feature> · E2E Test

**Date:** <YYYY-MM-DD>
**Environments:** <local / dev / UAT>
**Implementation:** `output/07-impl.md`
**Requirements:** `output/02-requirements.md`

## Coverage

| AC ID | Scenario | Steps | Expected | Actual | Verdict |
|---|---|---|---|---|---|
| UC4 AC1 | Variants tab on slide-in | 1. … 2. … | Variant cards render with samples + status tags | … | Pass / Fail / Blocked |

## Cross-flow scenarios

1. <name> (covers UC1 AC2 → UC2 AC2 → UC6 AC1 → UC3 AC4)
   - Steps: …
   - Expected: …
   - Verdict: …

## Findings

- <severity: blocker / warning / note> — <description> — <AC IDs affected>

## Verdict

Ready for release | Blocked by <N> issues (see Findings → Patch phase).
```

## Rules

- Every `[e2e]`-tagged AC in `02-requirements.md` must appear in the coverage table — no silent skips. Count must equal the `e2e` column of the UC↔AC index.
- Verdicts are `Pass` / `Fail` / `Blocked`. Write `Blocked` when the test cannot run (env down, missing data) and explain in Findings.
- Cross-UC AC references in the requirements doc (`UC6 AC5` depends on `UC3 AC4`) become candidate cross-flow scenarios — at least one cross-flow per dependency chain.
- Blockers → next phase is `Patch`. No blockers → release.
- Do NOT add `**Reviewer:**` placeholders in `08-e2e.md`. Lift every Finding (blocker / warning / note) and every Blocked test into README's `Reviewer to-do > Pending` with severity + AC IDs inline.
