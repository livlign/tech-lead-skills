---
name: patch
description: Fix issues surfaced by Phase 8 (E2E). Only for E2E failures — not for new scope.
---

# Skill: Patch

Triggered by the `08-e2e.md` failure list. Resolve each failure with minimal, surgical changes. Same scope rules as Phase 7 — no scope creep, no drive-bys.

## Input
- `output/08-e2e.md` — the failure list. Every Fail / Blocked row is an item.
- `output/05-techspec.md` and `output/07-impl.md` — context for the change.

## Output
- File: `output/09-patch.md`.
- Then rewrite `README.md` to reflect this phase's outcomes and refresh the Progress table.

---

## Step 1: Root-cause each failure

For each failure from `08-e2e.md`:
- Reproduce the symptom; confirm the AC fails for the reason `08-e2e.md` records.
- Trace to root cause — apply the **Bug investigations** rule from `AGENT.md` (Symptom → Surface → call chain → verified vs assumed → hypothesis → fix). No bundling of related-sounding concerns until the relation is proven.

## Step 2: Apply the minimal fix

- Same surgical-change rules as Phase 7. Touch only what the failing AC requires.
- No new scope. If a finding implies scope creep, **flag it as a follow-up ticket** in README Pending — don't bundle it into the patch.
- After each fix, re-run the failing AC end-to-end. The AC must turn green before moving on.
- If a patch fails verification, loop back to Phase 7 (or earlier when the spec itself is wrong). Don't ship until every failing AC is green.

## Step 3: Write the doc

Write to `output/09-patch.md`. Include:
- Per failure: AC ID, symptom, root cause, fix, files changed, verification (re-run result of the failing AC).
- Updated phase 7 file-change list (delta only — what this patch added on top of `07-impl.md`).
- Any scope-creep findings flagged as follow-up.

Then rewrite `README.md`. Lift unresolved blockers and follow-ups into `Reviewer to-do > Pending`.
