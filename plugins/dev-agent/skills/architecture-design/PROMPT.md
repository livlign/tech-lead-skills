# architecture-design

> High-level shape — components, communication, reuse-vs-new. No code.

<!--
Portable prompt. Use as a system prompt, Cursor rule, Windsurf rule, Aider convention,
custom-GPT instructions, or paste-into-chat block. Generated from SKILL.md
- do not edit directly. Source: https://github.com/livlign/tech-lead-skills
-->

---
# Architecture

## Audience rule

High-level shape. Readable by any technical reviewer on the team — engineering or otherwise — but **accuracy beats brevity**. Names of services, repos, databases, and persistent stores must match what's in the codebase — not friendly substitutes. Verify by reading the target repos' top-level docs, config files, and persistence-layer classes before writing names into the doc.

- **Services / repos** — use the actual repo or service name. Add a one-phrase role gloss only if useful.
- **Databases / persistent stores** — use the actual DB name or persistence-context name from the code. Don't invent shorthand if the code doesn't use it.
- **Tables / collections / cache keys** — accurate when named, not paraphrased.
- **Communication** — name the integration mechanism in plain terms ("REST", "queue", "event") but keep it accurate where the wire matters (sync REST vs async queue is a real architectural choice).

Skip code-level minutiae (exact class names, interface contracts, file paths, exhaustive payload schemas) — those go to `output/.refs/<topic>.md` (e.g. `contracts.md`, `schema.md`). The architecture doc names the components and how they talk; the ref file holds the wire detail.

## Skip when

No new service / module / wire format / contract **and** the shape is already written down somewhere the team can find. Do not skip on the basis of "the shape is obvious" or "the team already knows" — if it isn't on paper, write it. Tell the user when skipping and why.

## Input

`output/01-grooming.md`, `output/02-requirements.md`.

## Do

1. **Entity ownership (mandatory section, FIRST).** Lift the grooming entity table into the architecture doc and resolve every ownership row to a concrete decision:
   - **No conflict** → caller writes locally; document the write path.
   - **Conflict resolved by reuse** → caller delegates to the owner via an internal call. Name the call shape (sync HTTP, gRPC, in-proc dispatch, queue / event). Cite the existing internal-service interface to mirror.
   - **Conflict resolved by reimplementation** → only with explicit reviewer authorization recorded here. Hard to get; require a one-line "why not delegate" rationale.

   **Error codes live in the owning service.** Never introduce parallel taxonomies in non-owning services. If FE never branches on numeric codes (verify via grep), prefer no new enum — let the owning service's exceptions propagate raw.

2. **Precedent citations (mandatory section).** For every cross-service hop, new endpoint, new queue / event, new UI flow → cite the existing precedent at `repo/path/file.<ext>:line` that this new piece mirrors. The doc reads like *"This flow mirrors the existing X feature (file:line) — same shape, same call direction, same DI pattern."* If no precedent exists, call it out as **net-new architecture**; that triggers a higher-bar review.

3. **Call-chain sketch (mandatory section).** Before any sequence diagram, write the bare-bones chain in one block. Every hop, every direction, sync / async tag. Example:
   ```
   FE → service-a (HTTP, sync)
      → service-a: lookup + permission check
   FE → service-b (HTTP, sync)
      → service-b: write + property values
      → service-b → service-a (HTTP, sync, cross-service)
         → service-a: dependent write
      → service-b returns to FE
   ```
   This is what the reviewer signs off on. Sequence diagrams elaborate it; the chain block is the contract.

4. List repos / services that change or get created.
5. List communication interfaces between them (REST, gRPC, queue, pub-sub, in-process). Name the queue / topic / route shape when known.
6. Mark each component **net-new** or **reuse**.
7. Draw **one sequence diagram per non-trivial flow** in the requirements (UC1..UCn) — Mermaid is the default since it renders inline in most Markdown viewers, but use whatever diagram tool your team prefers (PlantUML, Excalidraw, drawio, ASCII). Skip use cases that are static visibility, single-call CRUD, or read-only display — they don't earn a diagram. Plus **one** data-flow diagram showing how data moves between components and stores.
8. **High level only.** No file paths, no class names, no SQL — except in the precedent citations (step 2) where `file:line` is required.

**Mermaid sequence-diagram pitfalls** (skip if using a different tool). The Mermaid parser is fragile. Avoid the following in message bodies, `Note over` text, and `alt` / `else` labels:

- **Double-quoted phrases** (`"foo"`) → drop the quotes.
- **Semicolons** in any line → replace with `and`.
- **Parenthesised sub-clauses with internal commas** like `(foo, bar)` or `(foo: x)` → rewrite as plain prose. Single-word parens (`(rows)`) tend to work; longer ones don't.
- **Parenthesised `else` labels** like `else Multiple Matches (lookup key)` → rewrite (`else Multiple Matches from a lookup key`).
- **`<br/>` immediately followed by `(`** in a message body — the parser stumbles on the combination.
- Slashes (`/`) and dashes inside parens are usually fine; the trouble is the *combination* of parens + commas + line-break tags.

When in doubt, write the message as one short prose line.

## Output — `output/03-architecture.md`

Short. Diagrams over paragraphs.

Template:

````markdown
# <TICKET> — Architecture

## Entity ownership
| Entity | Owner repo | Writer used today | This task writes via | Decision |
|---|---|---|---|---|
| <Entity A> | <service-a> | <existing writer / handler> | <how this task writes it> | reuse — extend owner |
| <Entity B> | <service-b> | <existing writer / handler> | internal endpoint called by service-a | reuse — call owner |

Any "reimplement" decision needs an explicit reviewer-signoff line below the table.

## Precedents
| New piece | Mirrors precedent | file:line |
|---|---|---|
| <service-a → service-b internal mapping call> | <existing internal-service interface> | <repo/.../File.ext:NN> |
| <new public endpoint on service-a> | <sibling controller / handler> | <repo/.../File.ext:NN> |

Net-new architecture (no precedent) must be called out explicitly and justified.

## Call-chain sketch
Plain text. Every hop, every direction, sync / async marker. This is what the reviewer signs off on.

```
FE → service-a (HTTP, sync)
   → service-a: <work>
   → service-a → service-b (mechanism, sync / async)
     → service-b: <work>
   → service-a → FE (response shape)
```

## Components
| Component | Repo / Service | Net-new or reuse | Responsibility |
|---|---|---|---|

## Communication
| From → To | Mechanism | Sync / Async | Notes |
|---|---|---|---|

## Sequence diagrams
One per non-trivial flow. Skip read-only or static-visibility use cases.

### UC<n> — <flow name>
```mermaid
sequenceDiagram
  ...
```

### UC<m> — <flow name>
```mermaid
sequenceDiagram
  ...
```

## Data flow
```mermaid
flowchart LR
  ...
```

## Trade-offs (only when a real choice exists)
- **Option A** — pros / cons.
- **Option B** — pros / cons.
- **Pick:** A. Why: <one line>.

## Failure modes
For every cross-service hop, name the partial-failure shape. Examples: "service-b saves the local row but the cross-service call to service-a fails → orphan row on service-b side, FE sees error from service-b, no compensation". The reviewer signs off on whether each partial-failure is acceptable, compensated, or distributed-transaction-protected.
````

## After writing

Rewrite `README.md`. Lift to `Pending`: schema changes, cross-service contracts, options without a clear winner.
