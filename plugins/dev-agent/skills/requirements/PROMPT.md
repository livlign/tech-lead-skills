# requirements

> Turn the groomed task into use cases anyone can read.

<!--
Portable prompt. Use as a system prompt, Cursor rule, Windsurf rule, Aider convention,
custom-GPT instructions, or paste-into-chat block. Generated from SKILL.md
- do not edit directly. Source: https://github.com/livlign/tech-lead-skills
-->

---
# Requirements

## Audience rule

Output is for **everyone** — PM, designer, QA, business, dev. Plain language. No class names, no SQL, no endpoint paths, no library jargon. A QA reading this doc must be able to write test cases without asking an engineer.

Engineering detail (entity names, schema, IDs, error codes) goes to `output/.refs/<topic>.md`.

## Input

`output/01-grooming.md` + any reviewer answers on the README.

## Do

1. List the **use cases** (UC1, UC2…). One per user-visible flow.
2. For each UC, use the fields below. **Match depth to complexity** — simple flows get two or three lines; multi-step flows earn the full structure.
3. Cover edge cases and obvious failure paths. Don't invent niche scenarios.
4. No class names, no SQL, no endpoint paths. Business behaviour only.

## Use case fields

Required: **Trigger**, **Steps** (or **Outcome** for one-step flows), **Outcome**, **Acceptance criteria**.
Optional, add when they earn their keep: **Precondition**, **Edge cases**.

- **Trigger** — the event that starts the flow ("operator scans a code", "import job runs", "user opens Studio Settings").
- **Precondition** — the state that must already hold (add-on present, scan mode is X, user is logged in). Skip if obvious from the trigger.
- **Steps** — numbered. User actions and system responses interleaved as a dialogue. Drop this field for trivial single-step flows; the Outcome alone is enough.
- **Outcome** — the postcondition, written so QA can verify it ("sample exists and is checked in", "toggle value is persisted").
- **Edge cases** — alternative paths, cancels, failures. Skip if there genuinely aren't any.
- **Acceptance criteria** — required when the UC has any user-visible behaviour. One bullet per AC, Given-When-Then in a single sentence. Skip only for pure system invariants (the `**The system shall …**` line is the AC).

### Acceptance criteria format

- Each AC is one bullet of the shape:
  `- **AC<n> (short name)** \`[tag]\` — Given …, when …, then ….`
- **Stable IDs** — `UC<n> AC<m>`, never renumbered after the doc ships. Phase 5/6/7/8 cite these IDs verbatim.
- **Tag** — exactly one of:
  - `[unit]` — single rule in isolation (validator, enum render, sync-mode branch). No I/O.
  - `[integration]` — multiple components wired together with real DB / services in-process. No browser.
  - `[e2e]` — full stack with the real UI in a browser. The AC mentions what the user sees / clicks.
- **Picking the tag** — pick the cheapest test that actually proves the rule. If an AC could be `[integration]` *or* `[e2e]`, prefer `[integration]`.
- **Cross-UC references** — when an AC depends on another (`UC6 AC5` depends on `UC3 AC4`), name the other AC inline. Don't restate the rule.

At the bottom of the doc, add a UC↔AC index:

```markdown
## UC ↔ AC index

| UC | Flow | AC count | unit | integration | e2e |
|---|---|---|---|---|---|
| UC1 | <name> | <n> | <n> | <n> | <n> |
```

Phase 6 (test-authoring) and phase 8 (E2E) read this table to plan coverage.

## Output — `output/02-requirements.md`

Plain language. Short sentences. PM/QA/dev can all read it.

### Multi-step example

```markdown
## UC5 — Variants Check-In scan
- **Trigger:** operator scans a variant code in Variants Check-In mode.
- **Precondition:** studio has the ProductHub add-on.
- **Steps:**
  1. System looks up variants by the scanned code.
  2. One match → system shows "create new sample or pick existing".
  3. Multiple matches → user picks the variant, then "create or pick existing".
  4. No match → user picks a product, then a new-variant form.
  5. On "create" → system creates a sample and chains a check-in.
  6. On "pick existing" → system check-ins the chosen sample.
- **Outcome:** sample exists and is checked in to the chosen location.
- **Edge cases:**
  - Cancel at any step → return to the scan input, no changes.
  - Check-in fails → sample stays created; user sees the error and can retry.

### Acceptance criteria
- **AC1 (single match — auto create + check-in)** `[e2e]` — Given the operator is in Variants Check-In mode with a scan location set, when they scan a code matching one variant, then a sample is created and checked in at the scan location.
- **AC2 (multiple matches — operator picks)** `[e2e]` — Given the scan resolves to multiple variants, when the operator picks one, then a sample is created on the picked variant and checked in.
- **AC3 (no match — new-variant flow)** `[e2e]` — Given no variant matches, when the operator fills the new-variant form and picks a product, then the variant, sample, and check-in are all created.
- **AC4 (cancel at any step — no changes)** `[e2e]` — Given any step before the create call, when the operator cancels, then no variant or sample is persisted.
- **AC5 (check-in failure — sample retained)** `[integration]` — Given the sample was created, when the check-in call fails, then the sample stays and the operator sees a retryable error.
```

### Simple example

```markdown
## UC1 — Toggle "Create samples from import"
- **Trigger:** user changes the toggle in Studio Settings and saves.
- **Outcome:** the new value is persisted and effective for subsequent imports.

### Acceptance criteria
- **AC1 (save persists)** `[integration]` — Given the toggle is changed, when the user saves, then the new value is persisted at studio scope and read by subsequent imports.
```

### System-driven flow (no human actor)

```markdown
## UC6 — Import gating
- **Trigger:** import job runs.
- **Steps:**
  1. System reads the studio's two toggles.
  2. Master off → no samples created; products land in "Waiting for sample".
  3. Master on, default off → samples created only for rows that explicitly request one.
  4. Master on, default on → one default sample per product.
- **Outcome:** import completes; samples reflect the toggle state.
```

For pure system invariants (no flow at all), a single `**The system shall …**` line is enough.

## After writing

Rewrite `README.md`. Lift to `Pending` only items the reviewer must decide.
