# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-14

### Added
- Initial production release
- Parallel checker pipeline with hash caching (instant runs)
- Real static checkers: oxlint 1.83.0, spectral 6.16.3
- LLM-as-MITM judge with heuristic + optional API grade
- Hard Gate (severity 3) blocks delivery, exit code 1
- 13 category skills (5 mirrored + 8 new)
- Input validation: path traversal protection, file size limits
- Category whitelist validation
- Logging/debug system (LOG_LEVEL env)
- Security audit script
- Vitest test suite (14 tests)
- GitHub Actions CI workflow
- npm publish configuration
- CLI binaries: antislop-check, antislop-judge, antislop-audit

### Security
- Path traversal protection on judge --file
- 1MB file size limit
- Category whitelist validation
- Secret scan on repo (clean, only intentional test secrets)

## [0.1.0] - 2026-09-14

### Added
- Initial prototype
- Scaffold: registry.json, antislop.md, 13 category skills
- Checker pipeline (placeholder)
- Judge MITM (heuristic only)
- Adapters: Claude + dsh junctions
