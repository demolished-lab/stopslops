# Tests — Quality Guidelines

**Focus**: Tests that catch real bugs and document behavior.

## Quality Principles

### Tests Are Documentation
Good tests show how code should be used and what it should do. They're executable specifications.

### Tests Catch Bugs
If a test always passes regardless of implementation, it's not catching bugs — it's theater.

### Tests Are Maintainable
Brittle tests that break with every refactor slow development. Robust tests focus on behavior, not implementation.

## Guidelines

### Test Behavior, Not Implementation
Test what your code does, not how it does it. Implementation details change; behavior shouldn't.

```typescript
// GOOD: Tests behavior
it('returns user by ID', async () => {
  const user = await getUser(123);
  expect(user.name).toBe('John');
});

// RISKY: Tests implementation
it('calls database query', async () => {
  await getUser(123);
  expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = 123');
});
```

### Give Tests Clear Names
A test name should explain what's being tested and what should happen.

```typescript
// GOOD
it('returns 404 when user does not exist', () => { ... });
it('validates email format before saving', () => { ... });

// UNCLEAR
it('works', () => { ... });
it('test', () => { ... });
```

### Assert Specific Outcomes
Vague assertions don't catch bugs. Be specific about what you expect.

```typescript
// VAGUE
expect(result).toBeTruthy();

// SPECIFIC
expect(result).toEqual({ id: 1, name: 'John', email: 'john@example.com' });
```

### Use Real Dependencies When Possible
Mocking everything hides real integration issues. Use real databases, real APIs, real file systems in tests when feasible.

### Test Edge Cases
Happy paths are easy. The bugs live in edge cases: empty inputs, null values, boundary conditions, concurrent access.

### Async Needs Await
Async operations without `await` create flaky tests that sometimes pass, sometimes fail.

```typescript
// RISKY
it('fetches data', () => {
  fetchData().then(result => expect(result).toBeDefined());
});

// RELIABLE
it('fetches data', async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});
```

### Skip With Reason
Skipped tests hide known issues. When you skip, explain why and track the fix.

```typescript
// GOOD
it.skip('broken due to upstream bug #123 — fix expected 2025-01', () => { ... });
```

## The Flexibility Principle

Testing is about confidence, not coverage percentages. Some code needs thorough tests; some needs quick smoke tests. Use judgment about what level of testing provides value for the context.
