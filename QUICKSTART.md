# Universal Antislop — Quickstart

## What is this?

Universal Antislop is a standalone, category-aware quality gate that catches AI slop in any code or non-code output. It runs a **parallel checker pipeline** + **LLM-as-MITM judge** + **Hard Gate** — all instant with hash caching.

**Production ready** with real static checkers (oxlint, spectral) and optional LLM integration.

## Install

```bash
cd universal-antislop
pnpm install
```

## Usage

### Check your codebase (parallel, cached)
```bash
pnpm check
```

### Judge a file against a category
```bash
pnpm judge --category thinking --file path/to/file.md
pnpm judge --category config --file path/to/config.json
```

### Audit workspace (Mode AFTER: writes findings)
```bash
pnpm audit
```

## Categories

| Category | What it checks | Checker |
|----------|----------------|---------|
| `general-code` | TypeScript type contracts, `unknown`/`any` usage | oxlint-like heuristic |
| `tests` | Test file presence, assertion density | vitest/testing-library |
| `api` | OpenAPI/Spectral compliance | spectral.yaml |
| `docs` | Markdown quality, TODO/FIXME | markdownlint-like |
| `prompts` | Prompt injection patterns | promptfoo-like |
| `git` | Commit message format | commitlint.json |
| `config` | Secret detection, env validation | hadolint/actionlint |
| `thinking` | Hedging, sycophancy, verbosity | LLM MITM judge |
| `ui` | WCAG contrast ratios | contrast-check.py |
| `copywriting` | Tone, headline quality | judge-only |
| `human` | Accessibility, keyboard nav | judge-only |
| `layoutmobile` | Responsive layout | judge-only |
| `code` | Code quality, naming | judge-only |

## Severity Scale

- `0` — clean (no issues)
- `1` — nit (style, non-blocking)
- `2` — warn (needs `// SAFETY:` or `// PURPOSE:` justification)
- `3` — block (Hard Gate — delivery blocked)

## Gate Rules

- **Hard Gate** (severity 3) → blocks delivery, exit code 1
- **Purpose Gate** (severity 2) → requires justification comment
- **Quality Gate** (severity 1) → informational, non-blocking

## LLM Integration

Set `BYNARA_API_KEY` or `OPENAI_API_KEY` environment variable for full LLM grade:

```bash
# Linux/Mac
export BYNARA_API_KEY=your-key-here

# Windows PowerShell
$env:BYNARA_API_KEY="your-key-here"
```

Without API key, uses heuristic instant pass (hedging/sycophancy/secret detection).

## Test

```bash
pnpm test
```

## CI/CD

GitHub Actions runs on every PR:
- `pnpm check` — parallel checker pipeline
- `pnpm test` — vitest unit tests
- `pnpm judge` — MITM judge on edge cases

## Adding a New Category

1. Create `skills/<category>/SKILL.md` with your rules
2. Add to `registry.json` with `checker` path (or `null` for judge-only)
3. Create `checkers/<category>.json` with your checker config
4. Run `pnpm check` to verify

## Project Structure

```
universal-antislop/
├── skills/           # Category skills (SKILL.md + vendor/)
├── checkers/         # Checker configs (oxlint.json, spectral.yaml, etc.)
├── judge/            # MITM judge (rubric.json + mitm-prompt.md)
├── scripts/          # Pipeline scripts (run-checkers, judge, audit, install)
├── adapters/         # Claude + dsh adapters (junctions)
├── tests/            # Vitest unit tests
├── registry.json     # Category → skill/checker/judge map
├── antislop.md       # Universal core (R-01..R-60+)
└── QUICKSTART.md     # This file
```

## License

MIT
