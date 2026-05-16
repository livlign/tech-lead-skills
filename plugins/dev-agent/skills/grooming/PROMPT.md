# grooming

> Frame the task, scan the code to verify claims, decide if architecture is needed.

<!--
Portable prompt. Use as a system prompt, Cursor rule, Windsurf rule, Aider convention,
custom-GPT instructions, or paste-into-chat block. Generated from SKILL.md
- do not edit directly. Source: https://github.com/livlign/tech-lead-skills
-->

---
# Grooming

## Audience rule

Output is for **everyone** — PM, designer, QA, business, dev. Plain language. No commit hashes, no class names, no file paths, no DB types, no enum values, no route shapes, no library jargon. The reader should understand what's happening even if they've never touched the code.

Engineering detail moves to `output/.refs/<topic>.md` (e.g. `already-shipped.md`, `current-system.md`). The grooming doc references it with one line: *"Engineering detail: see `output/.refs/<topic>.md`."*

## Input

Task brief, the linked ticket (whatever tracker the team uses — Jira, Linear, GitHub Projects, etc.), prototype, anything in the task's `input/` folder, and the codebase itself.

## Do

1. Read every file in `input/`.
2. Grep / Read the codebase to verify any claim about existing enums, tables, handlers, controllers, FE components. **Do not ask the reviewer what the code can answer.**
3. Identify impacted repos. Include frontend repos when there's a UI surface. Honour any "ignore these repos" list configured in the workspace.
4. **Entity inventory + ownership map (mandatory).** Enumerate every entity the task creates, mutates, or links. For each, name the **owning repo / service** (the canonical writer of that entity's lifecycle). Use the workspace's domain glossary, persistence-layer locations, and existing controller authority. Output a table in the grooming doc:

   | Entity | Owning service | Writer used today | Where this task wants to write it |
   |---|---|---|---|

   If the "wants to write" column ≠ the "Owning service" column for any row, **the architecture phase is mandatory** and a `Q-ownership-<entity>` question must land in README `Pending`. Default answer: *"reuse the owner's writer via internal call; do not reimplement"*. Reimplementation requires explicit reviewer authorization captured in the architecture doc.

5. **Existing-precedent search (mandatory).** For every new behaviour the task introduces (an endpoint, a cross-service hop, a new event, a popup flow, a SQL seed pattern), grep the codebase for the closest existing example and cite it as `file:line`. The grooming doc lists these as a "Precedents" table:

   | New behaviour | Closest existing precedent | file:line |
   |---|---|---|

   If no precedent exists, that's a red flag — flag it as a `Q-precedent-<topic>` in README `Pending`. "We're inventing X; is that intentional, or am I missing a sibling pattern?". This catches the case where the team has already solved this exact problem and the spec is about to reinvent it.

6. **Error-code reuse check.** For any new exception / error path the task introduces, locate the existing taxonomy in the owning service. Never introduce a parallel enum in a non-owning service. If no taxonomy exists in the owner, propose either reusing a generic shared-infra code or — only when the new code is consumed by FE for branching — adding to the owner's enum.

7. Decide: is Architecture (step 3) needed? Skip it when there's no new service / wire format / contract AND no cross-service ownership question AND every new behaviour has a clean precedent. **Never skip when any of those three open.**

## Output — `output/01-grooming.md`

One screen. Plain language.

Sections:
- **Problem** — 1–2 sentences in user/business terms. What hurts today?
- **What we're delivering** — 1–3 sentences. What will change for the user?
- **Decisions made** — bullet list. Business decisions only (toggle name, behaviour change, gating). No class/file/DB names.
- **Who's affected** — small table: area of the product → what changes there. "Studio Settings page", "Imports", "Database" — not "ProductsController", "Persistence layer".
- **Entity ownership map** — the table from step 4. Repos named directly; this is the one section where naming services is required.
- **Precedents** — the table from step 5. Every new behaviour paired with an existing file:line example, or flagged as net-new.
- **Already done** (if applicable) — one paragraph. Point at `output/.refs/already-shipped.md` for engineering detail.
- **Still to do** — short bullet list, plain.
- **In scope** / **Out of scope** — bullets.
- **Architecture step needed?** — yes/no + one line. If any ownership-conflict or missing-precedent row exists, answer is always yes.

## After writing

Rewrite `README.md`. Lift to README `Pending` only items the reviewer must decide (business calls, schema changes, cross-service contracts, options without a clear winner). Apply confident defaults silently.
