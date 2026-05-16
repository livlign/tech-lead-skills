---
name: codebase-compare
description: Analyze a codebase using two complementary approaches (Claude default tools vs ast-graph + FalkorDB) and produce a shareable summary.html with scan metrics, agreed repo stats, top hotspots, and a tool-per-action cheatsheet. Use when the user wants a codebase overview, benchmark, or ast-graph demo.
---

# Skill: codebase-compare

Produces a single-screen, screenshot-friendly HTML summary comparing a Claude-default-tools scan of a repo against an ast-graph + FalkorDB scan of the same repo.

## When invoked

The user wants one of:
- "compare ast-graph vs Claude tools on this repo"
- "generate a codebase overview / summary / scan report for X"
- "demo ast-graph on repo Y"
- a visual deliverable they can screenshot and share

## Folder structure

```
.claude/skills/codebase-compare/
├── SKILL.md                          # this file
└── templates/
    └── summary-template.html         # parameterized HTML, copy + fill placeholders
```

## Inputs

Ask if the user didn't provide them:
1. **Repo path** (required) — absolute path to the root of the codebase.
2. **Output path** (default: `<repo>/docs/codebase-overview/summary.html`).
3. **FalkorDB URL** (default: env `FALKOR_URL`, else `falkor://localhost:6379`).
4. **Graph name** (default: `<repo-folder>_code_graph`, e.g. `myrepo_code_graph`).

## Prerequisites

- `ast-graph` binary on PATH. See [github.com/emtyty/ast-graph](https://github.com/emtyty/ast-graph) for build instructions. If missing, tell the user and stop — don't install automatically.
- FalkorDB reachable at the configured URL. Verify via a raw `GRAPH.LIST` TCP call if in doubt; FalkorDB returns an array.

## Health check before scanning (important)

tree-sitter grammar crates ship their own ABI versions. If the ast-graph source was built with an older `tree-sitter` runtime than a grammar requires, files in that language **fail to parse silently** (just a warning per file) — the scan "succeeds" but the graph is mostly empty.

**Detect:** run the scan first, then check the scan log. If you see many lines like:
> `WARN ... Failed to parse <file>: Incompatible language version N. Expected minimum X, maximum Y`
…and the "Graph Summary" at the end lists fewer languages than you'd expect (e.g. only JavaScript for a .NET repo), the ast-graph build is stale for that grammar's ABI.

**Fix:** bump `tree-sitter` in `<ast-graph-source>/Cargo.toml` to the minimum version that accepts ABI `N`. Rough map:
| ABI reported in error | Minimum `tree-sitter` version |
|---|---|
| 14 | 0.24 |
| 15 | 0.25 |
| 16 | 0.26 |

Then rebuild (`cargo build --release`) and re-run the scan.

Ask the user before editing ast-graph's source — this is a cross-repo change, not a project-local one.

## Workflow

### 1. Scan with ast-graph
Run:
```
ast-graph --backend falkor --falkor-url <URL> --falkor-graph-name <GRAPH> scan <REPO> --clean
```
Capture elapsed scan time (visible in the logs / `Finished …` line) and the final "Graph Summary" block (files, nodes, edges, languages).

### 2. Spawn two agents in parallel

Use a single message with two `Agent` tool calls. Both agents write their report to `<output_dir>/agent1_scan_result.md` and `<output_dir>/agent2_scan_result.md` respectively.

**Agent 1 prompt (default file tools):**
```
Analyze the codebase at <REPO> using ONLY the agent's built-in file tools (Glob, Grep, Read, Bash equivalents). Do NOT use the ast-graph binary.

Produce a markdown report at <OUTPUT_DIR>/agent1_scan_result.md with:
- Summary paragraph
- Metrics table: LOC (total + per-language), files, classes, interfaces, records, enums, methods, controllers, CQRS/feature slices (pick an appropriate grouping unit and document your choice), handlers (command/query/event), DTOs, background jobs, Kafka consumers or equivalent messaging, entities/models
- 5–10 representative end-to-end business flows (real symbol names: Controller → Handler → Repo → DB)
- Architecture observations (layering, patterns, smells)
- Methodology (exact commands, what was included/excluded)
- Run metrics: `date +%s%3N` at start and end, wall-clock duration, estimated tokens used

Exclude build outputs (bin/, obj/, node_modules/, .git). Note vendored/third-party code separately from first-party. Budget 15–25 min. Keep the report readable — tables, headings, no walls of text.

When done, return a ≤150-word brief with top-line metrics and the report path.
```

**Agent 2 prompt (ast-graph + FalkorDB):**
```
Analyze the codebase at <REPO> using the ast-graph CLI and Cypher queries against FalkorDB graph `<GRAPH>` at `<URL>`. You may Read a single file to verify a finding, but do NOT do broad Glob/Grep exploration — the point is to demonstrate ast-graph.

Binary: ast-graph (pass `--backend falkor --falkor-url <URL> --falkor-graph-name <GRAPH>` before subcommands).

Subcommands available: scan, export, query (Cypher), stats, hotspots, call-chain, symbol.

The graph is already populated, but DO run one fresh `scan . --clean` into the same graph so you can report scan elapsed time.

Produce a markdown report at <OUTPUT_DIR>/agent2_scan_result.md mirroring Agent 1's schema. For each metric, record the Cypher / subcommand used. Run 5–10 business-flow traces via `call-chain` / `symbol --callees`. Include a hotspots section from the `hotspots` subcommand. End with methodology and run metrics (start/end epoch-ms, scan subcommand elapsed time, tokens used).

When done, return a ≤150-word brief with top-line metrics and the report path.
```

### 3. Consolidate metrics

Read both reports. For each metric:
- If both agree → use the agreed value in the "Repo information" panel.
- If they diverge → pick a normalized number based on a consistent definition, and note the discrepancy in your chat reply (not in the HTML). Typical divergences and resolutions:
  - **Controllers**: normalize as "first-party REST + gRPC, excluding scaffolding (TestController, POC HomeController)". Cross-check with `find <repo> -name '*Controller*.cs' -not -path '*/bin/*' -not -path '*/obj/*'`.
  - **LOC**: prefer first-party only; note vendored exclusion in the `<small>` text.
  - **Handlers**: normalize to a definition covering MediatR-style handlers + event handlers; document the split.

For hotspots, pick 3 rows. Sources are typically:
- 2 from ast-graph (fan-out/fan-in from `hotspots` subcommand).
- 1 from Claude tools (per-symbol LOC, since ast-graph ranks by call degree).
Tag each row with a small `src-ast` or `src-claude` pill based on provenance.

### 4. Render summary.html

1. Copy `templates/summary-template.html` to the output path.
2. Find-and-replace every `{{PLACEHOLDER}}` with the consolidated data (see Placeholders below).
3. If a placeholder has no data (e.g. the repo doesn't use Kafka), replace with `n/a` and keep the row.

Never hand-author a new HTML from scratch — always copy the template.

### 5. Report back

Tell the user:
- Output path
- Top-line highlights (faster approach, top hotspot, anything surprising)
- One line on what was normalized and why (if anything)

## Placeholders

| Placeholder | Example | Source |
|---|---|---|
| `{{REPO_NAME}}` | `myrepo` | repo folder name |
| `{{SCAN_DATE}}` | `2026-04-18` | today |
| `{{FILES}}` | `810` | ast-graph `stats` |
| `{{LOC_SUMMARY}}` | `~53k LOC C#` | Agent 1 (first-party) |
| `{{AGENT1_TIME}}` | `10 min 28 sec` | Agent 1 wall-clock |
| `{{AGENT1_TOKENS}}` | `84.4k` | Agent 1 tokens |
| `{{AGENT1_CALLS}}` | `88` | Agent 1 tool calls |
| `{{AGENT2_TIME}}` | `5 min 38 sec` | Agent 2 wall-clock |
| `{{AGENT2_TOKENS}}` | `86.7k` | Agent 2 tokens |
| `{{AGENT2_CALLS}}` | `82` | Agent 2 tool calls |
| `{{REPO_FILES}}` | `810` | consolidated |
| `{{REPO_LOC}}` | `~53k` | consolidated |
| `{{REPO_LOC_LANG}}` | `C#` | primary language |
| `{{REPO_CLASSES}}` | `~1,350` | consolidated |
| `{{REPO_INTERFACES}}` | `118` | consolidated |
| `{{REPO_METHODS}}` | `~1,570` | consolidated |
| `{{REPO_CONTROLLERS}}` | `19 + 1 gRPC` | normalized |
| `{{REPO_FEATURES}}` | `16` | CQRS feature slices / vertical slices |
| `{{REPO_HANDLERS}}` | `~48` | event handlers count |
| `{{REPO_CONSUMERS}}` | `~48` | Kafka consumers or equivalent; use `n/a` if none |
| `{{REPO_JOBS}}` | `8` | background jobs |
| `{{REPO_ENUMS}}` | `39` | consolidated |
| `{{REPO_ENTITIES}}` | `0` (+ `external` small note) | DB entities in-repo |
| `{{REPO_ENTITIES_NOTE}}` | `external` or `` | small text next to entity count |
| `{{H1_NUM}}` / `{{H1_UNIT}}` / `{{H1_NAME}}` / `{{H1_DESC}}` / `{{H1_SRC}}` | `139` / `outgoing` / `UpdatePartialSessionCommandHandler.Handle` / `Top orchestrator...` / `ast` | hotspot 1 |
| `{{H2_*}}` | hotspot 2 | |
| `{{H3_*}}` | hotspot 3 | |

`{{H*_SRC}}` must be `ast` or `default`.

## Static sections

Do NOT parameterize these (they describe the tools themselves, not the repo):
- "What each approach is good at"
- "Best approach per action" cheatsheet
- Legend under the cheatsheet

## Notes

- This skill targets .NET / TypeScript / Rust / Python codebases. For niche languages without good tree-sitter grammars, Agent 2 may produce thin output — note that explicitly in the chat reply.
- The HTML is designed to fit a 1440×900 screenshot. Keep it single-screen — if content overflows, trim hotspot descriptions before trimming metrics.
- Don't add emojis anywhere in the HTML.
- Preserve the existing color coding: blue = ast-graph, red = default file tools, purple = combo.
