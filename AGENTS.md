# AGENTS.md — index for `livlign/tech-lead-skills`

> Cross-agent index. Designed to be picked up by [AGENTS.md](https://agents.md)-aware tools (Aider, OpenAI Codex, Cursor's MDC import, and others), and to double as a human-readable map of what's in this repo.

This repository ships a tech lead's lifecycle skills as Claude Code plugins, **plus a portable `PROMPT.md` next to every skill** so the same content works in any LLM agent: ChatGPT system prompts, Cursor / Windsurf / Cline rules, Aider conventions, custom GPTs, paste-into-chat, etc.

## Skills

### Tech-lead skills (4)

| Skill | Portable file | What it does |
|---|---|---|
| meeting-agenda | [plugins/tech-lead/skills/meeting-agenda/PROMPT.md](./plugins/tech-lead/skills/meeting-agenda/PROMPT.md) | Generate a weekly status agenda from current ticket state + recent meeting notes. |
| meeting-summary | [plugins/tech-lead/skills/meeting-summary/PROMPT.md](./plugins/tech-lead/skills/meeting-summary/PROMPT.md) | Turn Gemini / transcript-style meeting notes into a decisions + action-items summary. |
| tracer-bullet | [plugins/tech-lead/skills/tracer-bullet/PROMPT.md](./plugins/tech-lead/skills/tracer-bullet/PROMPT.md) | Thread a `debugTraceId` through BE + FE call chain under a common marker (`[TRACER]` / `[TRACER-FE]`) so a single id greps the whole flow across logs and the browser console. |
| codebase-compare | [plugins/tech-lead/skills/codebase-compare/PROMPT.md](./plugins/tech-lead/skills/codebase-compare/PROMPT.md) | Two-pass repo overview: default file-tools scan vs ast-graph + FalkorDB scan, consolidated into a screenshot-friendly HTML summary. Requires the [ast-graph](https://github.com/emtyty/ast-graph) binary for the second pass. |

### Dev-agent — orchestrator + 10 sub-skills

The flagship: a stack-agnostic build loop that takes a task from grooming through e2e patch, with light reviewer gates between AI phases.

| Skill | Portable file | Phase |
|---|---|---|
| **Orchestrator** | [plugins/dev-agent/PROMPT.md](./plugins/dev-agent/PROMPT.md) | Drives phases 0–9; load this first. |
| grooming | [plugins/dev-agent/skills/grooming/PROMPT.md](./plugins/dev-agent/skills/grooming/PROMPT.md) | 1 — Frame the problem, entity-ownership map, precedent search. |
| requirements | [plugins/dev-agent/skills/requirements/PROMPT.md](./plugins/dev-agent/skills/requirements/PROMPT.md) | 2 — Use cases. Business logic only, no UI prose. |
| architecture-design | [plugins/dev-agent/skills/architecture-design/PROMPT.md](./plugins/dev-agent/skills/architecture-design/PROMPT.md) | 3 — High-level shape. Components, communication, sequence + flow diagrams. |
| task-plan | [plugins/dev-agent/skills/task-plan/PROMPT.md](./plugins/dev-agent/skills/task-plan/PROMPT.md) | 4 — Tasks with UC mapping, test plan, deploy plan. |
| tech-spec | [plugins/dev-agent/skills/tech-spec/PROMPT.md](./plugins/dev-agent/skills/tech-spec/PROMPT.md) | 5 — Concrete file / DB / API changes. |
| test-authoring | [plugins/dev-agent/skills/test-authoring/PROMPT.md](./plugins/dev-agent/skills/test-authoring/PROMPT.md) | 6 — Failing unit tests + E2E skeletons. Stubs + drivers. |
| implementation | [plugins/dev-agent/skills/implementation/PROMPT.md](./plugins/dev-agent/skills/implementation/PROMPT.md) | 7 — One task per commit, reviewer gate. |
| e2e-test | [plugins/dev-agent/skills/e2e-test/PROMPT.md](./plugins/dev-agent/skills/e2e-test/PROMPT.md) | 8 — End-to-end walkthrough, surface failures. |
| bug-fix | [plugins/dev-agent/skills/bug-fix/PROMPT.md](./plugins/dev-agent/skills/bug-fix/PROMPT.md) | Any phase — nail the call chain before proposing a fix. |
| patch | [plugins/dev-agent/skills/patch/PROMPT.md](./plugins/dev-agent/skills/patch/PROMPT.md) | 9 — Patch surfaced E2E failures only. |

## How to use these in other agents

### Claude Code (native plugins)

```
/plugin marketplace add livlign/tech-lead-skills
/plugin install tech-lead@livlign
/plugin install dev-agent@livlign
```

### Cursor / Windsurf / Cline

Copy the relevant `PROMPT.md` into the editor's rules directory:

- Cursor: `.cursor/rules/<skill-name>.mdc` (wrap in MDC frontmatter)
- Windsurf: `.windsurfrules` (concat)
- Cline / Roo: `.clinerules`

### Aider

Reference any `PROMPT.md` in `CONVENTIONS.md`, or add this repo as a read-only dep and Aider will discover `AGENTS.md`.

### ChatGPT / Gemini / Mistral / custom GPTs

Paste the `PROMPT.md` body as the system prompt or custom-GPT instructions block.

### Any other agent

`PROMPT.md` is plain markdown with no agent-specific calls — works as a system prompt anywhere.

## Building locally

`PROMPT.md` files are generated from `SKILL.md` / `AGENT.md` via `scripts/build-prompts.mjs`. If you edit a `SKILL.md`, regenerate:

```bash
node scripts/build-prompts.mjs
```

Single source of truth is the `SKILL.md` / `AGENT.md` file — never edit `PROMPT.md` by hand.
