# Config — Quality Guidelines

**Focus**: Configuration that's secure, maintainable, and documented.

## Quality Principles

### Config Is Code
Configuration files are executed or interpreted. Treat them with the same care as code.

### Secrets Don't Belong in Config
Secrets in config files end up in version control. Use environment variables or secret managers.

### Document Non-Obvious Settings
If a setting isn't self-explanatory, add a comment explaining what it does and why.

## Guidelines

### Use Environment Variables for Secrets
Never commit secrets to version control. Use environment variables or secret managers.

```yaml
# BAD
api_key: sk-nry-Q8Hqf3Gg7ea-x4tGQOoLF_AuYEVjbP727G4UpgcCXiI

# GOOD
api_key: ${API_KEY}
```

### Pin Versions
Unpinned versions can break deployments unexpectedly. Pin for reproducibility.

```yaml
# RISKY
image: nginx

# STABLE
image: nginx:1.25.3-alpine
```

### Document Complex Settings
If a setting requires explanation, add a comment.

```yaml
retry:
  max_attempts: 3  # Total attempts before failing
  backoff: exponential  # exponential | linear | fixed
```

### Validate Configurations
Use schema validation to catch configuration errors early.

### Use Relative Paths
Hardcoded absolute paths break when environments change. Use relative paths or environment variables.

### Remove Dead Config
Unused settings create confusion. Remove configuration that's no longer referenced.

## The Flexibility Principle

Configuration strictness depends on context. Development config can be relaxed. Production config needs rigidity. Match the strictness to the environment.
