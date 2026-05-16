# meeting-agenda

> Generate a concise weekly status + discussion agenda for a product / engineering team standup. Use this skill whenever the user asks "what to discuss in the meeting today", "agenda for today's meeting", "prepare for the standup", "weekly meeting notes", or any variant — including casual phrasing like "meeting agenda" or "what should I bring up today". Always produce a bullet-point format: Updates grouped by status, optional insights note, then Discussion topics with short context per line.

<!--
Portable prompt. Use as a system prompt, Cursor rule, Windsurf rule, Aider convention,
custom-GPT instructions, or paste-into-chat block. Generated from SKILL.md
- do not edit directly. Source: https://github.com/livlign/tech-lead-skills
-->

---
# Meeting Agenda

Generates a meeting agenda in a tight, bullet-point format for a weekly product / engineering team meeting. The output is short, scannable, and meant to be pasted directly into a meeting note.

## Output format

Use this exact structure:

```
{Date}, {Team name}
Updates

{Release / Stage marker} Deployed
* {TICKET-KEY} Title
* {TICKET-KEY} Title

Doing this sprint
* {TICKET-KEY} Title - {short note: % done, or "just started", or "complete this sprint?"}
* {TICKET-KEY} Title

Discovering
* {TICKET-KEY} Title - {short note: "blocked by {TICKET-KEY}", "Confirm X", "% done"}
* {TICKET-KEY} Title

Discussion
* Topic: short context (one line)
* Topic: short context
```

The `{Release / Stage marker}` is whatever identifier your team uses for the deployed batch — a release number, a sprint id, a date stamp, or just the stage name on its own. Use the team's existing convention; don't invent one.

### Section rules

- **{Release / Stage marker} Deployed** — only include if there are tickets at the deployed/release stage (UAT, staging, prod — whatever your team's promotion stage is). Otherwise omit the section entirely.
- **Doing this sprint** — tickets actively in flight ("In Progress" / "In Development" / "Doing" / whatever your tracker calls it), PLUS any picked-up "Ready for Dev" / "To Do" tickets that have started in the current sprint (check sprint / iteration assignment, not just status). The user will correct if anything is misplaced.
- **Discovering** — tickets in pre-development states ("Discovery" / "Refinement" / "Spec" / "Design" — your tracker's equivalent). Include blockers inline (e.g. "blocked by {TICKET-KEY}"). Omit grooming / ready-for-grooming states unless the user asks.
- **Do NOT include "Next sprint" or anything further out.** Weekly cadence means upcoming work is covered next time.
- **Backlog and Released / Done** are not listed — they're for the team's board, not the agenda.

### Inline notes — keep them short

After a ticket title, add one short note only when it adds signal:
- Progress: `- 86%`, `- 25%`
- Just started: `- just started`
- Release plan: `- complete this sprint?`, `- plan next release` (or use your team's sprint / release identifier if you have one)
- Blocker: `(blocked by {TICKET-KEY})`
- Status check: `- Confirm list APIs will be supported`

Skip the note if the ticket is unremarkable. Don't write full sentences.

### Optional insights line

Between Updates and Discussion, you may add a 1–2 sentence insights paragraph IF
something is genuinely notable:
- A bottleneck on the critical path
- Scope concern (e.g. few stories opened, tight release date)
- Cross-dependency risk

Skip it entirely if nothing stands out. Don't manufacture insights for the sake of structure.

## How to build the agenda

### Step 1 — Pull current ticket status

Query your team's ticket tracker (Jira, Linear, GitHub Projects, etc.) for the relevant scope (objective / epic / team). Capture: statuses, priorities, release targets, and epic progress %.

### Step 2 — Scan recent meeting notes for open items

Look in the team's meeting-notes folder for the most recent meeting summaries (e.g. `meeting-summary-YYYY-MM-DD.md`). Read the 1–2 most recent ones plus any mid-cycle notes.

From these, extract:
- Action items still pending (not marked done in later meetings)
- Open questions carried forward
- Async items raised by team members (e.g. messages quoted in notes)
- Cross-team dependencies still unresolved

### Step 3 — Check conversation memory

Pull from the agent's memory (if available):
- Recurring blockers
- Pending alignments with named individuals
- Customer feedback items needing triage
- Architectural decisions in flight

### Step 4 — Draft the Discussion list

Discussion items should be:
- Short — topic + 3–8 word context
- Actionable — something to decide or align on, not just FYI
- Time-bound — relevant to *this* meeting

Drop items that:
- Were resolved since the last meeting
- The user has explicitly said are done or not needed
- Belong in a different forum (e.g. 1:1, async chat)

### Step 5 — Present and iterate

Show the draft. Expect the user to:
- Move tickets between sections (e.g. "this one starts this sprint, move it up")
- Strike discussion items as resolved
- Tighten notes ("we are done 90%, the rest pending so-and-so")
- Add items the agenda missed

Match their corrections exactly — don't re-expand notes they shortened.

## Style guide

- Sentence-case headings, no markdown bold inside bullets
- Use `-` as the bullet marker on inline notes after the title (e.g. `TKT-1004 <feature title> - just started`)
- Use `(parenthetical)` for blockers
- Keep ticket titles short — strip obvious project prefixes (e.g. "<Product Name>:"), but keep the core noun phrase
- No emojis, no decorative formatting

## Example

```
May 13, 2026 — Team A
Updates

Pre-prod Deployed
* TKT-1250 Feature One
* TKT-1257 Feature Two
* TKT-1285 Feedback batch — Apr 17

Doing this sprint
* TKT-1200 Feature Three - 90%
* TKT-1168 Feature Four
* TKT-1005 Feature Five
* TKT-1004 Feature Six - complete this sprint?

Discovering
* TKT-1203 Public API - Confirm list APIs will be supported
* TKT-1153 Feature Seven - Dev start discovery this sprint

Discussion
* Migration: pending confirmation from some customers
* Feature Six: plan next release
* Public API + Webhooks: walk through draft API list
* Feature Seven prototype
* Customer feedback triage for next-half roadmap
```

## What to omit

- Don't list every ticket with metadata (priority badges, release codes, epic numbers). That's the board, not the agenda.
- Don't repeat the OKR rationale — the team knows it.
- Don't add motivational framing or summaries.
- Don't ask the user clarifying questions before drafting — produce a first pass, let them correct it.
