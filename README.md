<p align="center">
  <img src="docs/banner.svg" alt="Universal Anti-Slop" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/🛡️_Anti_Slop-v1.0.0-ff6b6b" alt="Anti-Slop Version">
  <img src="https://img.shields.io/badge/🔥_Slop_Kills-0-feca57" alt="Slop Killed">
  <img src="https://img.shields.io/badge/⚡_Speed-350ms-48dbfb" alt="Speed">
  <img src="https://img.shields.io/badge/🏢_Enterprise-Ready-2ecc71" alt="Enterprise Ready">
</p>

<p align="center">
  <strong>Because your code deserves better than "TODO: fix this later"</strong>
</p>

---

## 🎯 The Hard Truth

AI generates code. **Most of it is slop.**

You know the drill:
- `any` types everywhere
- Variable names like `x`, `data`, `temp`
- Comments that say nothing
- Tests that test nothing
- Docs that document nothing

**We catch that slop.** Before it ships. Before it breaks. Before your team riot-quit.

---

## 🚀 What Is This?

A **quality gate** that runs in:
- Your terminal (CLI)
- Your CI/CD (GitHub Actions)
- Your API (REST endpoints)
- Your enterprise (multi-tenant)

It checks **13 categories** of code quality, uses **LLM judges** for nuanced evaluation, and **blocks deployment** on severity 3.

**Speed:** 350ms judge. 290ms checkers. Your CI won't even notice.

---

## 🎬 Before/After

### ❌ Slop (What AI Generates)

```typescript
function process(data: any) {
  // TODO: fix this later
  const x = data.map((i: any) => {
    if (i != null) {
      return i.value;
    }
    return null;
  });
  return x;
}
```

### ✅ Anti-Slop (What You Ship)

```typescript
function processUserInput(
  data: UserInput
): ProcessedData[] {
  return data
    .filter((item): item is ValidInput => 
      item !== null && item.value !== undefined
    )
    .map(({ id, value }) => ({
      id,
      processedValue: transformValue(value),
      timestamp: Date.now()
    }));
}
```

**What changed:**
- ❌ `any` → ✅ Proper types
- ❌ `data` → ✅ Descriptive name
- ❌ `x` → ✅ Clear return value
- ❌ Comment → ✅ Real logic
- ❌ `!= null` → ✅ Type guard

---

## ⚡ Quick Start

```bash
# Install
npm install -g universal-antislop

# Autonomous mode - detects your project and adapts
antislop auto

# Check your codebase
antislop-check

# Judge a file
antislop-judge --category general-code --file src/index.ts

# Run health check
antislop-health
```

---

## 🤖 Autonomous Mode

**It just works.** No configuration needed.

### How It Works

1. **Scans** your project (language, framework, structure)
2. **Detects** what you're building
3. **Auto-selects** relevant categories
4. **Runs** only what matters
5. **Enhances** based on context

### Commands

```bash
# Scan project and detect context
pnpm auto:scan

# Run checks based on detected context
pnpm auto:check

# Auto-fix based on detected context
pnpm auto:fix

# Dry run - see what would be fixed
pnpm auto:fix:dry
```

### What It Detects

| Context | What It Does |
|---------|--------------|
| React/Vue/Angular | Enables UI, layoutmobile, tests |
| Express/Fastify | Enables API, tests, docs |
| TypeScript | Enables config, general-code |
| Python | Enables config, general-code |
| Has tests | Enables tests category |
| Has docs | Enables docs category |
| Infrastructure | Enables config, docs |

### Example Output

```
🔍 Scanning project...
📁 Found 47 files
🌐 Languages: typescript, javascript
⚛️ Frameworks: react, next
📦 Project type: webapp
🧪 Tests: yes
📚 Docs: yes

🎯 Selected categories:
  • general-code: Base category for all projects
  • git: Git best practices
  • ui: Frontend framework detected
  • layoutmobile: Mobile responsiveness needed
  • tests: Test files detected
  • docs: Documentation files detected
  • config: JavaScript/TypeScript configuration
```

---

## 🎯 13 Categories

| Category | What It Checks |
|----------|----------------|
| `general-code` | Overall code quality |
| `tests` | Test effectiveness |
| `api` | API consistency |
| `docs` | Documentation quality |
| `prompts` | LLM prompt effectiveness |
| `git` | Commit message quality |
| `config` | Configuration management |
| `thinking` | Reasoning chains |
| `ui` | UI/UX code quality |
| `copywriting` | Content quality |
| `human` | Accessibility |
| `layoutmobile` | Mobile responsiveness |
| `code` | Code comments |

---

## 🏢 Enterprise Features

### 🛡️ Hard Gate
Blocks deployment on severity 3. No exceptions. No workarounds.

### 🔄 Circuit Breaker
Automatic failure detection and recovery. 5 failures = circuit opens. 60 seconds = auto-reset.

### 📊 Health Monitoring
`/health`, `/ready`, `/live` endpoints. Kubernetes-native. 9ms response time.

### 🏢 Multi-Tenant
Isolated environments per organization. Per-tenant rate limits. Usage tracking.

### 📋 Audit Logging
SOX, HIPAA, SOC2, GDPR compliant. JSONL format. Compliance reports.

### 🔒 Security
Secret scanning, path traversal protection, dependency auditing.

---

## 👥 Who Uses This?

| Role | Why They Use It |
|------|-----------------|
| 🏗️ System Architect | Enforce architectural decisions automatically |
| 👔 Engineering Manager | Track quality metrics, prove team excellence |
| 🚀 Solo Developer | Enterprise quality without enterprise budget |
| 💡 Startup CTO | Ship fast, don't ship slop |
| 🌐 Open Source Maintainer | Automated contribution quality |
| 🛡️ Security Engineer | Compliance automation, audit trails |
| 👨‍💻 Tech Lead | Consistent quality across the team |
| 📊 Product Manager | Quality metrics for stakeholders |
| 🎓 Educator | Teaching best practices |
| 🔧 DevOps/SRE | Health checks, load testing |
| ✍️ Technical Writer | Documentation quality |
| 🧪 QA Engineer | Test quality validation |
| 🤖 AI/ML Engineer | Prompt and reasoning quality |
| 🏢 Enterprise Architect | Organization-wide enforcement |
| 🎨 Freelancer | Portfolio quality |
| 🏢 Agency | Client deliverable quality |

---

## 🎮 Live Demo

### Try It Now

```bash
# Clone the repo
git clone https://github.com/demolished-lab/stopslops.git
cd stopslops

# Install dependencies
pnpm install

# Run all checks
pnpm check

# Run tests
pnpm test

# Start health server
pnpm health
```

### CI/CD Integration

```yaml
# .github/workflows/ci.yml
name: Anti-Slop Quality Gate
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      - run: pnpm check  # Blocks on severity 3
```

---

## 📈 By The Numbers

| Metric | Value |
|--------|-------|
| Categories | 13 |
| Judge Speed | 350ms |
| Checker Speed | 290ms |
| Uptime SLA | 99.99% |
| Slop Tolerance | 0 |
| Tests | 20 |
| All Passing | ✅ |

---

## 🗺️ Roadmap

### v1.0.0 - Core Engine ✅
- 13 categories
- Parallel checkers
- LLM judge
- Hard Gate

### v1.1.0 - Enterprise Features ✅
- Circuit breaker
- Rate limiting
- Health checks
- Audit logging

### v1.2.0 - Multi-Tenant ✅
- Isolated environments
- Per-tenant config
- Usage tracking

### v1.3.0 - Platform 🔄
- API marketplace
- Quality certification
- Analytics dashboard

### v2.0.0 - AI Native 📋
- Custom model training
- Real-time learning
- Predictive quality

---

## 🎯 Architecture

```
┌─────────────────────────────────────────────────┐
│                  Universal Anti-Slop              │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────┐    ┌─────────────┐             │
│  │   Checkers   │    │    Judge    │             │
│  │  (13 total)  │───▶│  (LLM MITM) │             │
│  └─────────────┘    └─────────────┘             │
│         │                   │                    │
│         ▼                   ▼                    │
│  ┌─────────────────────────────────┐            │
│  │          Hard Gate              │            │
│  │  (Severity 3 = BLOCK)          │            │
│  └─────────────────────────────────┘            │
│         │                                        │
│         ▼                                        │
│  ┌─────────────────────────────────┐            │
│  │       Enterprise Layer          │            │
│  │  • Circuit Breaker              │            │
│  │  • Rate Limiting                │            │
│  │  • Health Checks                │            │
│  │  • Audit Logging                │            │
│  └─────────────────────────────────┘            │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**TL;DR:**
1. Fork it
2. Branch it
3. Test it
4. PR it

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- Built by [demolished-lab](https://github.com/demolished-lab)
- Inspired by the suffering of developers who read AI-generated code
- Dedicated to all the `TODO` comments that will never be fixed

---

<p align="center">
  <strong>Star us if we saved you from shipping slop ⭐</strong>
</p>
