# General Code — Quality Guidelines

**Focus**: Code that's maintainable, type-safe, and clear in intent.

## Quality Principles

### Type Safety Enhances Quality
Type-safe code catches bugs early, documents intent, and enables refactoring. Use TypeScript's type system to express what your code does — not just what it accepts.

### Clarity Over Cleverness
Code is read more than it's written. Clear, straightforward code beats clever one-liners that save keystrokes but cost understanding.

### Intentional Tradeoffs
Every pattern has tradeoffs. `unknown` might be correct at boundaries. `any` might be intentional for dynamic code. The question is: is the tradeoff intentional and documented?

## Guidelines

### Prefer Precise Types Over `unknown`
When you know what a value should be, express it in the type system. Use `unknown` at genuine boundaries where the type is truly unknowable.

```typescript
// At API boundaries — unknown is correct
function parseInput(raw: unknown): ParsedData { ... }

// Inside your app — prefer precise types
function processUser(user: User) { ... }  // Not: function processUser(user: unknown)
```

### Document Type Assertions
Type assertions bypass TypeScript's safety. When you need one, explain why it's safe.

```typescript
// SAFETY: The schema parser validated this value above.
const userId = value as UserId;
```

### Use Consistent Patterns
Pick patterns and stick with them. Consistency reduces cognitive load for readers.

### Name Things Clearly
Good names are documentation. `processData` tells you nothing. `validateUserEmail` tells you everything.

### Handle Errors Explicitly
Unhandled errors surprise users. Explicit error handling makes failure modes visible and recoverable.

### Structure for Readability
Code that's easy to scan is code that's easy to maintain. Group related logic, separate concerns, and use whitespace to signal structure.

## The Flexibility Principle

These are quality suggestions, not rigid rules. If you have a good reason to break a guideline, document it and move on. The goal is better code, not compliance.
