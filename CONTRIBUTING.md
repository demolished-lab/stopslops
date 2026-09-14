# Contributing to Universal Anti-Slop

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feature/your-feature`
5. Make your changes
6. Run tests: `pnpm test`
7. Commit your changes
8. Push to your fork
9. Submit a pull request

## Development

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Commands

```bash
pnpm install          # Install dependencies
pnpm test             # Run tests
pnpm check            # Run checkers
pnpm judge --category thinking --file <path>  # Run judge
```

### Code Style

- Use TypeScript for new scripts
- Follow existing code patterns
- Add tests for new functionality
- Update documentation as needed

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: restructure code (no behavior change)
test: add missing tests
chore: maintenance tasks
```

## Adding a New Category

1. Create `skills/<category>/SKILL.md` with quality guidelines
2. Create `checkers/<category>.json` with checker config
3. Add to `registry.json`
4. Add tests
5. Update documentation

## Reporting Issues

Use the GitHub issue tracker. Include:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details

## Pull Requests

- Keep PRs focused on one change
- Add tests for new functionality
- Update documentation
- Follow existing code style
- Reference related issues

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to build something useful.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
