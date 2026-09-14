# Docs — Quality Guidelines

**Focus**: Documentation that helps users succeed.

## Quality Principles

### Documentation Solves Problems
Good documentation answers the questions users actually have, not the questions the author finds interesting.

### Working Examples Beat Theory
A runnable code example teaches more than paragraphs of explanation.

### Documentation Ages
Documentation that references removed APIs or outdated practices misleads users. Keep it current.

## Guidelines

### Start With the Goal
Open with what the tool does and why someone would use it. Skip the history lesson.

### Provide Working Examples
Every code example should be runnable. Test your examples — they're your documentation.

```markdown
## Quick Start

```bash
npm install my-tool
```

```javascript
import { thing } from 'my-tool';

const result = thing({ input: 'hello' });
console.log(result); // { output: 'HELLO', timestamp: 1234567890 }
```
```

### Document Prerequisites
Don't assume users have the same setup. List what they need.

### Link, Don't Duplicate
If information exists elsewhere, link to it. Duplicated information drifts.

### Keep It Updated
Stale documentation is worse than no documentation. Delete or update docs that no longer apply.

### Write for Scanners
Most readers scan, not read. Use headings, lists, and code blocks to make scanning easy.

### Include Troubleshooting
Common errors and their solutions save users time and reduce support requests.

## The Flexibility Principle

Documentation style should match the audience. Internal docs can be terse. Public docs need more context. API reference can be formulaic. Tutorials should tell a story. Match the format to the purpose.
