# Git — Quality Guidelines

**Focus**: Commits that tell a clear story of changes.

## Quality Principles

### Commit Messages Are Documentation
Future developers (including you) will read these messages. Write them for humans.

### Atomic Commits Tell Stories
Each commit should be a complete thought. One logical change per commit.

### Context Helps Reviewers
Why was this change made? What alternatives were considered? Context helps code review.

## Guidelines

### Write Descriptive Messages
The first line should summarize the change. The body should explain why.

```bash
# GOOD
feat: add user email validation

- Validate email format before saving
- Return clear error messages for invalid formats
- Closes #123

# UNCLEAR
fix stuff
```

### Use Conventional Commits
Standard formats help automated tooling and make history scannable.

```bash
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: restructure code (no behavior change)
test: add missing tests
chore: maintenance tasks
```

### Reference Issues
Link commits to issues or tickets. This provides context for why changes were made.

### Keep Commits Focused
One commit = one logical change. Mixing unrelated changes makes history hard to follow and revert.

### Sign Your Work
When required, sign commits to verify authorship.

## The Flexibility Principle

Commit message strictness should match project needs. A solo prototype can be casual. A large team's codebase benefits from stricter conventions. Match the convention to the context.
