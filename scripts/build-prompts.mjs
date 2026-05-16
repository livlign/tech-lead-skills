#!/usr/bin/env node
// Generate PROMPT.md (portable, frontmatter-stripped) next to every SKILL.md and AGENT.md.
// Run from the repo root: `node scripts/build-prompts.mjs`
//
// PROMPT.md is the agent-agnostic form: any LLM (ChatGPT, Gemini, Cursor rules,
// Windsurf, Aider, custom GPTs) can consume the body directly as a system prompt
// or rules file. SKILL.md stays as the Claude Code form with frontmatter intact.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pluginsDir = join(repoRoot, 'plugins');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function parseFrontmatter(src) {
  if (!src.startsWith('---\n')) return { meta: {}, body: src };
  const end = src.indexOf('\n---', 4);
  if (end === -1) return { meta: {}, body: src };
  const fm = src.slice(4, end);
  const body = src.slice(end + 4).replace(/^\s*\n/, '');
  const meta = {};
  let lastKey = null;
  for (const line of fm.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      lastKey = m[1];
      meta[lastKey] = m[2].replace(/^["'>]\s*/, '').replace(/["']$/, '').trim();
    } else if (lastKey && line.trim()) {
      meta[lastKey] = (meta[lastKey] ? meta[lastKey] + ' ' : '') + line.trim();
    }
  }
  return { meta, body };
}

function buildPrompt(meta, body, sourcePath) {
  const name = meta.name || basename(dirname(sourcePath));
  const desc = (meta.description || '').replace(/\s+/g, ' ').trim();
  const header = [
    `# ${name}`,
    '',
    desc ? `> ${desc}` : null,
    '',
    '<!--',
    'Portable prompt. Use as a system prompt, Cursor rule, Windsurf rule, Aider convention,',
    `custom-GPT instructions, or paste-into-chat block. Generated from ${basename(sourcePath)}`,
    '- do not edit directly. Source: https://github.com/livlign/tech-lead-skills',
    '-->',
    '',
    '---',
    '',
  ].filter((line) => line !== null).join('\n');
  return header + body.trim() + '\n';
}

let count = 0;
for (const file of walk(pluginsDir)) {
  const name = basename(file);
  if (name !== 'SKILL.md' && name !== 'AGENT.md') continue;
  const src = readFileSync(file, 'utf8');
  const { meta, body } = parseFrontmatter(src);
  const out = buildPrompt(meta, body, file);
  const target = join(dirname(file), 'PROMPT.md');
  writeFileSync(target, out);
  count += 1;
  console.log(`wrote ${target.replace(repoRoot + '/', '')}`);
}

console.log(`\n✓ ${count} PROMPT.md files generated`);
