# Contributing

Thanks for considering a contribution. This repo is small and opinionated — the skills here distill a specific tech-lead workflow, so changes that sharpen an existing skill are easier to land than changes that introduce a new one.

## Ground rules

- **`SKILL.md` is the source of truth.** Every `PROMPT.md` is generated. Edit the `SKILL.md` (or `AGENT.md` for `dev-agent`), then regenerate — never hand-edit a `PROMPT.md`.
- **Stay stack-agnostic.** When a skill references a vendor (a log search system, a ticket tracker, a CI tool), list it as one example alongside others — never as the only option. Configure team-specific tooling in the workspace's `CLAUDE.md` / `AGENTS.md`, not in the skill itself.
- **Keep skills paste-ready.** A skill should produce useful output without a multi-step setup. If a change adds friction, it needs to pay for itself.

## Repo layout

```
plugins/
  tech-lead/        — installable plugin
    skills/<name>/
      SKILL.md      — source of truth (Claude Code frontmatter + body)
      PROMPT.md     — generated, portable form
  dev-agent/        — installable plugin
    AGENT.md        — orchestrator definition (source)
    PROMPT.md       — generated
    skills/<name>/  — per-phase skills, same SKILL.md / PROMPT.md split
scripts/
  build-prompts.mjs — regenerates every PROMPT.md
.claude-plugin/
  marketplace.json  — plugin marketplace manifest
```

## Workflow

1. Fork and branch from `main`.
2. Edit the relevant `SKILL.md` / `AGENT.md`.
3. Regenerate the portable prompts:

   ```bash
   node scripts/build-prompts.mjs
   ```

4. Test the skill end-to-end in Claude Code (install your fork as a local plugin) or by pasting the regenerated `PROMPT.md` into another agent. A skill that doesn't survive a fresh invocation isn't ready to merge.
5. Open a PR. In the description, name the skill(s) you touched and what changed in the output. Screenshots / paste-blocks of before-and-after output help a lot.

## What's in scope

- Sharpening an existing skill — clearer output format, better edge-case handling, removing dead weight.
- Filling holes in the lifecycle (a phase the current skills don't cover, with a concrete use case).
- Documentation, worked examples, demo recordings.

## What's likely out of scope

- New skills without a clear lifecycle slot or a concrete maintainer-facing example.
- Vendor-specific integrations baked into a skill body (route those through workspace config instead).
- IDE / editor adapters — the portable `PROMPT.md` is the adapter.

If you're unsure whether something fits, open an issue with the proposal before writing the code.

## Filing issues

- **Bug:** name the skill, paste the invocation, paste the actual vs expected output.
- **Idea:** describe the workflow gap in one paragraph, name a concrete moment it would have helped you.
