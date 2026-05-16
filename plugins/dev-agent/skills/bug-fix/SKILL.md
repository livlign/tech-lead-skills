---
name: bug-fix
description: Investigation template for any reported defect. Load whenever a defect symptom is being diagnosed — fresh Bug Fix task, mid-Phase-7 finding, or Phase 8 E2E regression. Forces a verified call chain before any fix is proposed.
---

# Bug investigation

A bug is a gap between expected and actual behaviour. The cost of guessing is wasted work and a wrong-direction fix. This skill exists because of one specific failure pattern: racing from symptom → fix without nailing the call chain, then proposing a change that doesn't even touch the right surface.

## Trigger

Load this skill **whenever** a defect symptom is being diagnosed, regardless of phase:

- The user reports something is broken (a fresh Bug Fix mode task).
- A Phase 7 implementation surfaces a regression in the existing suite.
- A Phase 8 E2E walkthrough surfaces a defect.
- A reviewer or QA flags incorrect behaviour mid-task.

The trigger is **the activity** (diagnosing a defect), not the **phase** the task is currently in.

## The template

Write each section down explicitly. Do not skip ahead.

### 1. Symptom

Restate exactly what the user sees, in their words. Pin specifics:
- Which entity / data row / tenant / account / user?
- Which surface (tab, popup, page)?
- Expected vs. actual outcome?

If the symptom is ambiguous, **ask** before reading code. Cheaper than chasing the wrong call chain.

### 2. Surface

Which UI component renders the symptom? Name the file. If the same conceptual surface (e.g. "the user list", "the detail panel") exists in multiple places (standalone page, slide-in, drawer, detail view), **ask the user which one** before assuming.

### 3. Call chain

Walk the chain end-to-end. Don't skip links.

| Link | What |
|---|---|
| Surface | Component file, function, line |
| API call | Exact URL + HTTP method + payload shape |
| BE controller | File + route attribute |
| Handler | Query/Command handler file |
| Repository | DB access layer (and whether the table is sharded) |
| Table / DTO | Source-of-truth table + DTO returned to caller |

If the surface doesn't issue a new API call (the symptom involves data already on `props`), the upstream loader is the call chain — find it and start there.

### 4. Verified vs assumed

Mark each link explicitly:

- **Verified** — read the actual code or response body, confirmed contents.
- **Assumed** — guessed based on naming or convention.

Aim to convert every link to **verified** before proposing a fix. Cheap wins:
- Network response from DevTools → verifies API + response body.
- Grep + Read → verifies controller / handler / DTO.
- DB query result from the user → verifies table contents.

### 5. Hypothesis

Where is the gap? Cite the evidence (line numbers, response keys, observed vs. expected values).

Be specific:
- "BE returns `totalCount` at line N of `<EntityDto>.<ext>`; FE reads `total` at line M of `<entityModel>.<ext>` → field name mismatch."
- NOT: "the count isn't showing up."

### 6. Fix proposal

Only after 1–5. State:
- Which file(s) change.
- What changes (one-liner).
- Why this is the right side of the fence (BE vs FE — defend the choice).
- Test that covers the regression.

## Rules

- **Don't bundle "related-sounding" concerns** without proving the relation. A hunch is not a justification. If you suspect caching, gating, or a separate issue is connected, write down the linking evidence first; if you can't, list it as a follow-up, not part of this fix.
- **Don't propose a fix on assumed links.** Verify every load-bearing step.
- **Stop and ask early** when the surface or call chain is ambiguous — much cheaper than two rounds of guessed fixes.
- **Match the trace test** from `AGENT.md` engineering principles: every line in the fix must trace directly back to a specific verified-gap from step 5.

## What this skill does NOT cover

- Reproducing the bug locally (separate setup work).
- Writing the patch itself (use `skills/patch.md` once the chain is nailed).
- Authoring the regression test (use `skills/test-authoring.md`).

This skill is just the diagnosis-discipline gate. Once steps 1–6 are written and the user agrees with the diagnosis, hand off to the relevant downstream skill.
