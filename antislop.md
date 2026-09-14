# Universal Anti-Slop — Quality Philosophy

**Focus**: Resulting quality, creativity, and richness of content.  
**Approach**: Flexible guidelines, not rigid rules.  
**Goal**: Help produce better output, not enforce compliance.

## Core Principles

### 1. Quality Over Compliance
The goal is not to pass a linter — it's to produce output that genuinely works well for its audience.

### 2. Context Matters
Rules bend based on context. A prototype needs different quality than production code. A creative brief needs different tone than technical documentation.

### 3. Evidence-Based Claims
Strong claims need evidence. Weak claims need hedging. Both have their place.

### 4. Rich, Not Verbose
More words ≠ better quality. Concise, evidence-backed statements beat verbose fluff.

### 5. Creative Flexibility
The best output often breaks conventions — when there's a reason. Anti-slop catches lazy patterns, not intentional choices.

## Severity Philosophy

- **0 (Clean)**: No issues detected
- **1 (Nit)**: Minor style preference — informational only
- **2 (Warn)**: Quality concern — worth reviewing, not blocking
- **3 (Block)**: Serious quality issue — needs attention before delivery

### The "SAFETY" and "PURPOSE" Escape Hatches

When you intentionally break a convention for a good reason:

```typescript
// SAFETY: This type assertion is validated by the schema parser above.
const userId = value as UserId;

// PURPOSE: This temporary hack is tracked in issue #123 and will be removed.
const legacyData = raw as unknown;
```

This keeps the gate honest while allowing intentional choices.

## Category Focus

Each category focuses on **what makes output quality** in that domain:

| Category | Quality Focus |
|----------|---------------|
| general-code | Code that's maintainable, type-safe, and clear in intent |
| tests | Tests that catch real bugs and document behavior |
| api | APIs that are consistent, well-documented, and evolving cleanly |
| docs | Documentation that helps users succeed |
| prompts | Prompts that produce reliable, safe outputs |
| git | Commits that tell a clear story of changes |
| config | Configuration that's secure, maintainable, and documented |
| thinking | Reasoning that's evidence-based, not hedged or sycophantic |
| ui | Interfaces that are accessible and usable by everyone |
| copywriting | Copy that communicates clearly and persuasively |
| human | Experiences that work for all people |
| layoutmobile | Layouts that work on all screen sizes |
| code | Code that's readable, testable, and maintainable |

## Detection Philosophy

Anti-slop uses three layers:

1. **Static checkers** — Catch obvious patterns (fast, deterministic)
2. **Heuristic analysis** — Detect quality concerns (fast, flexible)
3. **LLM judge** — Evaluate nuanced quality (slower, comprehensive)

The gate blocks only on serious issues (severity 3). Everything else is feedback for improvement.

## The Anti-Slop Promise

Anti-slop will:
- Catch lazy patterns that reduce quality
- Suggest improvements with evidence
- Allow intentional choices with justification
- Never block good work for rigid compliance

Anti-slop will NOT:
- Enforce arbitrary style preferences
- Block creative choices without evidence
- Replace human judgment
- Be the sole arbiter of quality
