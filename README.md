# 🛡️ Universal Anti-Slop

[![npm version](https://img.shields.io/npm/v/universal-antislop.svg)](https://www.npmjs.com/package/universal-antislop)
[![CI](https://github.com/demolished-lab/stopslops/actions/workflows/ci.yml/badge.svg)](https://github.com/demolished-lab/stopslops/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

**Production-ready anti-slop quality gate: parallel checkers + LLM MITM judge + Hard Gate.**

> Catch AI slop, enforce standards, and ship quality code — automatically.

---

## 🎯 What Is This?

Universal Anti-Slop is a **quality-as-a-skill** platform that catches lazy patterns, enforces standards, and validates output quality across 13 categories — from code to docs to prompts.

```
input → [checkers in parallel] → judge MITM → Gate → deliver / block+fix
                        (streaming, cached, interruptible)
```

### Why "Anti-Slop"?

AI-generated code is everywhere. Most of it is **slop** — generic, unclear, and lazy. This tool catches that slop before it reaches production.

| Slop Pattern | Anti-Slop Detection |
|--------------|---------------------|
| `any` types | ✅ Type safety enforcement |
| Magic numbers | ✅ Named constants required |
| Hedging language | ✅ Evidence-based claims |
| Unclear naming | ✅ Descriptive names required |
| No error handling | ✅ Explicit error handling |

---

## 👥 Who Uses This?

### By Role

| Role | Use Case | Value |
|------|----------|-------|
| **System Architect** | Enforce architectural decisions | Architecture compliance dashboard |
| **Engineering Manager** | Track quality metrics | Team performance visibility |
| **Product Manager** | Validate PRDs, docs | Product quality scorecard |
| **Solo Developer** | Personal quality gate | Ship faster with confidence |
| **Startup CTO** | Maintain quality without senior hires | Investor-ready code quality |
| **Open Source Maintainer** | Automated contribution quality | Project health metrics |
| **DevOps/SRE** | Health monitoring + DR | Operations dashboard |
| **Security Engineer** | Compliance automation | Security compliance report |
| **Technical Writer** | Documentation quality | Documentation scorecard |
| **QA Engineer** | Test quality = reliability | Test quality metrics |
| **AI/ML Engineer** | Prompt quality = output quality | AI quality metrics |
| **Compliance Officer** | Audit trails | Compliance dashboard |

### By Organization

| Organization | Use Case | Scale |
|--------------|----------|-------|
| **Agency/Consultancy** | Quality as a service | 50+ clients |
| **Enterprise** | Org-wide quality | 1000+ engineers |
| **Educational Institution** | Teaching quality | 1000+ students |
| **Freelancer** | Quality reputation | Premium pricing |

---

## 🚀 Quick Start

### Install

```bash
npm install -g universal-antislop
# or
pnpm add -g universal-antislop
```

### Use

```bash
# Check your codebase
antislop-check

# Judge a specific file
antislop-judge --category general-code --file src/index.ts

# Run health check
antislop-health
```

### Integrate

```yaml
# .github/workflows/ci.yml
- run: pnpm check  # Blocks deployment on severity 3
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [USE-CASES.md](USE-CASES.md) | Comprehensive use cases by role |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deployment patterns |
| [INTEGRATION.md](INTEGRATION.md) | Integration examples |
| [SCALING.md](SCALING.md) | Scaling strategies |
| [docs/SLA.md](docs/SLA.md) | Service Level Agreement |
| [docs/DISASTER-RECOVERY.md](docs/DISASTER-RECOVERY.md) | Disaster recovery plan |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Universal Anti-Slop                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Checkers   │  │    Judge    │  │   Gateway   │         │
│  │  (parallel)  │  │ (heuristic) │  │   (Hard)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Resilience  │  │   Tenant    │  │   Audit     │         │
│  │ (circuit BR) │  │  (isolated) │  │   (logs)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Health     │  │    API      │  │   Load      │         │
│  │  (probes)    │  │ (versioned) │  │  (testing)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Categories

| Category | What It Checks |
|----------|----------------|
| `general-code` | Type safety, clarity, intentional tradeoffs |
| `tests` | Behavior testing, clear names, specific assertions |
| `api` | Consistent naming, clear status codes, examples |
| `docs` | Working examples, clear structure, current content |
| `prompts` | Input validation, error handling, security |
| `git` | Descriptive messages, issue references, focused commits |
| `config` | Secret management, version pinning, documentation |
| `thinking` | Evidence-backed claims, honest disagreement, conciseness |
| `ui` | Contrast ratios, keyboard navigation, semantic HTML |
| `copywriting` | Clarity, evidence-backed claims, appropriate tone |
| `human` | Accessibility, keyboard support, clear feedback |
| `layoutmobile` | Responsive units, viewport meta, touch targets |
| `code` | Readable, testable, maintainable |

---

## 🛡️ Enterprise Features

### Resilience
- **Circuit Breaker**: 5 failures → open, 60s reset
- **Retry**: 3 attempts with exponential backoff
- **Rate Limiter**: 10 requests/minute

### Health Checks
```bash
GET /health   # Full status
GET /ready    # Kubernetes readiness
GET /live     # Kubernetes liveness
```

### Multi-Tenant
```bash
# Tenant isolation
curl -H "X-Tenant-ID: tenant_abc123" /check
```

### Audit Logging
```bash
# SOX, HIPAA, SOC2, GDPR compliance
node scripts/audit-logger.mjs --report 2026-01-01 2026-09-14
```

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| Judge | ~350ms |
| Checkers | ~290ms |
| Full pipeline | ~240ms |
| Health check | ~9ms |

---

## 🔧 Commands

```bash
# Core
pnpm check                    # Run all checkers
pnpm judge                    # Run judge
pnpm test                     # Run tests

# Enterprise
pnpm health                   # Start health server
pnpm api                      # Start API server
pnpm loadtest                 # Run load tests

# Security
pnpm security                 # Quick security scan
pnpm security:full            # Full security audit

# Development
pnpm typecheck                # Type checking
pnpm test:coverage            # Test coverage
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

## 🔗 Links

- [GitHub](https://github.com/demolished-lab/stopslops)
- [npm](https://www.npmjs.com/package/universal-antislop)
- [Issues](https://github.com/demolished-lab/stopslops/issues)

---

**Built with ❤️ by demolished-lab**
