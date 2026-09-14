# Code — Quality Guidelines

**Focus**: Code that's readable, testable, and maintainable.

## Quality Principles

### Code Is Read More Than It's Written
Optimize for reading, not writing. Clear code saves time for everyone who reads it.

### Simple Is Better Than Clever
Clever code saves keystrokes. Simple code saves understanding time.

### Explicit Is Better Than Implicit
Surprises are bugs waiting to happen. Make behavior obvious.

## Guidelines

### Name Things Descriptively
Good names are documentation. Bad names require comments.

```typescript
// UNCLEAR
const d = new Date();
const x = process(d);

// CLEAR
const currentDate = new Date();
const processedData = processDate(currentDate);
```

### Avoid Magic Numbers
Unexplained numbers are mysteries. Name them.

```typescript
// MYSTERY
if (retryCount > 3) { ... }

// CLEAR
const MAX_RETRY_ATTEMPTS = 3;
if (retryCount > MAX_RETRY_ATTEMPTS) { ... }
```

### Keep Functions Focused
Functions that do one thing are easier to test, understand, and reuse.

```typescript
// DOES TOO MUCH
function processUser(user) {
  validate(user);
  transform(user);
  save(user);
  sendEmail(user);
  logActivity(user);
}

// FOCUSED
function processUser(user) {
  const validated = validate(user);
  const transformed = transform(validated);
  return save(transformed);
}
```

### Handle Errors Explicitly
Unhandled errors surprise users. Explicit error handling makes failure visible.

```typescript
// SURPRISING
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// PREDICTABLE
async function fetchUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    logger.error('Failed to fetch user', { id, error });
    throw new UserFetchError(id, error);
  }
}
```

### Use Type Annotations
Type annotations document intent and catch bugs.

```typescript
// UNDOCUMENTED
function processData(data) {
  return data.map(item => item.value);
}

// DOCUMENTED
function processData(data: DataItem[]): number[] {
  return data.map(item => item.value);
}
```

### Avoid Global State
Global state creates hidden dependencies and makes testing difficult.

```typescript
// HIDDEN DEPENDENCY
let currentUser = null;

// EXPLICIT DEPENDENCY
class UserService {
  constructor(private db: Database) {}
  getUser(id: string) { ... }
}
```

### Log, Don't Console
Console statements in production create noise. Use proper logging.

```typescript
// NOISY
console.log('Processing:', data);

// STRUCTURED
logger.info('Processing data', { dataId: data.id, timestamp: Date.now() });
```

## The Flexibility Principle

Code quality depends on context. Prototypes benefit from speed. Production code benefits from rigor. Match your quality standards to the code's purpose and audience.
