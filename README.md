# Universal Antislop

[![npm version](https://img.shields.io/npm/v/universal-antislop.svg)](https://www.npmjs.com/package/universal-antislop)
[![CI](https://github.com/your-username/universal-antislop/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/universal-antislop/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

Production-ready anti-slop quality gate: parallel checkers + LLM MITM judge + Hard Gate.

## What it does

Catches AI slop in any code or non-code output before delivery. Every output passes through:

```
input -> [checkers in parallel] -> judge MITM -> Gate -> deliver / block+fix
                                    (streaming, cached, interruptible)
```

## Install

```bash
npm install -g universal-antislop
# or
pnpm add -g universal-antislop
```

## CLI Usage

### Check your codebase (parallel, cached)

```bash
antislop-check                           # check current project
antislop-check --path /path/to/project   # check specific project
LOG_LEVEL=debug antislop-check           # verbose output
```

### Judge a file against a category

```bash
antislop-judge --category thinking --file path/to/file.md
antislop-judge --category config --file path/to/config.json
antislop-judge --category general-code --file path/to/code.ts
```

### Audit workspace (writes findings)

```bash
antislop-audit                           # writes anti-slop/audit-*.md
```

## API

### Programmatic usage

```javascript
import { readFile } from 'node:fs/promises';

// Run checkers
const { execFile } = await import('node:child_process');
const { stdout } = await execFile('antislop-check', ['--path', '/your/project']);
console.log(JSON.parse(stdout));

// Run judge
const { stdout } = await execFile('antislop-judge', ['--category', 'thinking', '--file', 'README.md']);
const result = JSON.parse(stdout);
if (result.findings.some(f => f.severity === 3)) {
  console.error('Hard Gate blocked delivery');
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTISLOP_ROOT` | Project root path | `C:/Users/Raja/universal-antislop` |
| `LOG_LEVEL` | `error`, `warn`, `info`, `debug` | `info` |
| `BYNARA_API_KEY` | Bynara API key for LLM grade | (none) |
| `OPENAI_API_KEY` | OpenAI API key for LLM grade | (none) |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Clean — no Hard Gate violations |
| `1` | Hard Gate blocked — severity 3 found |
| `2` | Usage error — bad arguments or missing files |

## Categories

| Category | What it checks | Severity 3 triggers |
|----------|----------------|---------------------|
| `general-code` | TypeScript type contracts | `unknown`/`any` on public |
| `tests` | Test file presence | (none — informational) |
| `api` | OpenAPI/Spectral compliance | (none — informational) |
| `docs` | Markdown quality | (none — informational) |
| `prompts` | Prompt injection | (none — informational) |
| `git` | Commit message format | (none — informational) |
| `config` | Secret detection | `sk-*` patterns |
| `thinking` | Hedging/sycophancy | Sycophancy density |
| `ui` | WCAG contrast ratios | (none — informational) |
| `copywriting` | Tone quality | judge-only |
| `human` | Accessibility | judge-only |
| `layoutmobile` | Responsive layout | judge-only |
| `code` | Code quality | judge-only |

## Severity Scale

- `0` — clean (no issues)
- `1` — nit (style, non-blocking)
- `2` — warn (needs `// SAFETY:` or `// PURPOSE:` justification)
- `3` — block (Hard Gate — delivery blocked)

## Gate Rules

- **Hard Gate** (severity 3) → blocks delivery, exit code 1
- **Purpose Gate** (severity 2) → requires justification comment
- **Quality Gate** (severity 1) → informational, non-blocking

## Real Static Checkers

- **oxlint** — TypeScript/JavaScript linting
- **spectral** — API spec linting
- **contrast-check.py** — WCAG contrast ratios

## Test

```bash
pnpm test
```

## CI/CD

GitHub Actions runs on every PR:

```yaml
- run: pnpm check
- run: pnpm test
- run: pnpm judge --category thinking --file tests/thinking-edge-case.md
```

## Project Structure

```
universal-antislop/
├── scripts/          # CLI tools (run-checkers, judge, audit, logger)
├── skills/           # Category skills (SKILL.md + vendor/)
├── checkers/         # Checker configs (oxlint.json, spectral.yaml)
├── judge/            # MITM judge (rubric.json + mitm-prompt.md)
├── adapters/         # Claude + dsh adapters
├── tests/            # Vitest unit tests
├── registry.json     # Category → skill/checker/judge map
├── antislop.md       # Universal core (R-01..R-60+)
└── package.json      # npm publish config
```

## License

MIT
