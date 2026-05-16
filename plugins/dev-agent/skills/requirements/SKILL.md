---
name: requirements
description: Turn the groomed task into use cases anyone can read.
---

# Requirements

## Audience rule

Output is for **everyone on the team** — engineering and non-engineering alike. Plain language. No class names, no SQL, no endpoint paths, no library jargon. A non-engineering reviewer must be able to derive test cases from this doc without asking an engineer.

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

- **Trigger** — the event that starts the flow ("user submits a code", "import job runs", "user opens Settings").
- **Precondition** — the state that must already hold (feature flag on, user is logged in, account on a given plan). Skip if obvious from the trigger.
- **Steps** — numbered. User actions and system responses interleaved as a dialogue. Drop this field for trivial single-step flows; the Outcome alone is enough.
- **Outcome** — the postcondition, written so QA can verify it ("record exists and is linked", "toggle value is persisted").
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

Plain language. Short sentences. Technical and non-technical readers should both be able to follow it.

### Multi-step example

```markdown
## UC5 — Sign up with email verification
- **Trigger:** user submits the signup form.
- **Precondition:** the email-verification feature is enabled for new signups.
- **Steps:**
  1. System validates the form (email format, password strength, required fields).
  2. Validation passes → system creates the account in "Unverified" state and sends a verification email.
  3. Validation fails → system surfaces the per-field errors; no account is created.
  4. User clicks the verification link in the email.
  5. Link is valid and unexpired → system flips the account to "Verified" and signs the user in.
  6. Link is expired or already used → system shows a "resend verification" prompt.
- **Outcome:** the account exists and is in the correct state for the path taken.
- **Edge cases:**
  - Network failure while sending email → account stays "Unverified"; user sees a retryable error.
  - User signs up twice with the same email → second attempt returns the existing-account error without creating a duplicate.

### Acceptance criteria
- **AC1 (happy path — verified)** `[e2e]` — Given a fresh email, when the user submits a valid form and clicks the verification link, then the account is created and ends up in the "Verified" state, signed in.
- **AC2 (validation fails — no account)** `[e2e]` — Given any required field is invalid, when the user submits, then per-field errors render and no account is created.
- **AC3 (link expired — resend)** `[e2e]` — Given a verification link older than its TTL, when the user clicks it, then the user sees a "resend verification" prompt and the account remains "Unverified".
- **AC4 (duplicate signup — no duplicate)** `[integration]` — Given an account already exists for the email, when a new signup uses the same email, then the system returns the existing-account error and no duplicate account is persisted.
- **AC5 (email send fails — account retained)** `[integration]` — Given the account was created, when the verification-email send fails, then the account stays "Unverified" and the user sees a retryable error.
```

### Simple example

```markdown
## UC1 — Toggle "Email me on weekly summary"
- **Trigger:** user changes the toggle on their profile / notification settings and saves.
- **Outcome:** the new value is persisted and applied on subsequent weekly summary sends.

### Acceptance criteria
- **AC1 (save persists)** `[integration]` — Given the toggle is changed, when the user saves, then the new value is persisted at user scope and read by subsequent weekly summary jobs.
```

### System-driven flow (no human actor)

```markdown
## UC6 — Weekly summary send
- **Trigger:** weekly summary job runs.
- **Steps:**
  1. System enumerates users whose weekly-summary toggle is on.
  2. For each user, system composes a summary from their last-7-day activity.
  3. System sends the email through the configured transport.
  4. Send failures are queued for retry.
- **Outcome:** every opted-in user receives a summary; transient failures retry on the next pass.
```

For pure system invariants (no flow at all), a single `**The system shall …**` line is enough.

## After writing

Rewrite `README.md`. Lift to `Pending` only items the reviewer must decide.
