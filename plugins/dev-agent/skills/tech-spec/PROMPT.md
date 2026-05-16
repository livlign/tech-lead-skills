# tech-spec

> Write a technical specification before implementation. Required for Feature Implementation and Design Solution modes.

<!--
Portable prompt. Use as a system prompt, Cursor rule, Windsurf rule, Aider convention,
custom-GPT instructions, or paste-into-chat block. Generated from SKILL.md
- do not edit directly. Source: https://github.com/livlign/tech-lead-skills
-->

---
# Skill: Tech Spec

Translate the agreed solution into a detailed technical specification. This is the source of truth for implementation.

---

## Step 1: Write the Tech Spec

Cite the AC ID (`UC<n> AC<m>`) from `02-requirements.md` against every spec item so phase 6 can name tests by AC and phase 8 can trace coverage back. Don't restate behaviour — link back to the requirements doc.

Required sections:

### Overview
What is being built and why. One short paragraph.

### Impacted Areas
List of services, modules, and files that will change.

### File-by-file change list
New files, modified files, deleted files — one line of intent each. This is the canonical map for phase 7.

### API contracts
New / modified / removed endpoints. Per endpoint: request shape, response shape, status codes, **error codes citing the owning service's taxonomy** (no parallel enums in non-owning services). Flag breaking vs non-breaking.

### DB changes
Table / column DDL, indexes, FKs, seed rows. Cite migration / SQL script file.

### Event / queue payloads
Exact field shapes for any new event, queue message, or topic payload.

### Cross-service call shapes
Per cross-service hop: endpoint URL, payload, response, auth header (e.g. `[CrossService(true)]`).

### Validation rules
Field-by-field input validation, anchored to the AC that owns each rule.

### Performance Considerations
Any implications on throughput, latency, memory, or resource usage. Include caching strategies if relevant.

### Migration / Rollback Plan
Required if the change touches data or is high-risk. Describe how to safely roll out and roll back.

### Dependencies & Configurations
New packages, environment variables, feature flags, or external service dependencies.

### Open Questions
Any decisions still pending that could affect implementation. These must be resolved before implementation begins.

**MUST be raised as an open question (not silently decided):**
- Database changes — new columns/tables, migrations, type/index changes, backfill plans.
- Communication protocol between services — new endpoints/contracts, event/message schemas, sync-vs-async, call direction.
- Architecture decisions — new vs extended handler, where logic lives, reuse-vs-rewrite, new abstractions/interfaces, deploy-order/coupling.
- Any spot where the author picked one of several reasonable options; phrase as `Proposed: X (alternatives: Y, Z). Confirm?`.

Do NOT insert `**Reviewer:**` placeholders inside `output/05-techspec.md`. The reviewer will not see them.

---

## Step 2: Review and Confirm

Write to `output/05-techspec.md` (no reviewer placeholders).

Then rewrite `README.md` to reflect this phase's outcomes and refresh the Progress table. **Sweep the tech spec and lift EVERY item needing reviewer attention into README's `Reviewer to-do > Pending`** as a self-contained one-liner — README is the single surface the reviewer reads. Items to lift: open questions, decisions with alternatives, assumptions, risks/trade-offs, TODOs/"to-be-confirmed" markers, and anything in the mandatory categories above.

When the reviewer answers (inline in README or via chat), move the item to README's `Resolved` block AND back-annotate this doc's Open Questions entry with `[Resolved YYYY-MM-DD]` + the decision.

Do not proceed to implementation until the tech spec is confirmed and all open questions are resolved.
