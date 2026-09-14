# API — Quality Guidelines

**Focus**: APIs that are consistent, well-documented, and evolving cleanly.

## Quality Principles

### APIs Are Contracts
An API is a promise to consumers. Breaking that promise without warning erodes trust.

### Consistency Reduces Confusion
When similar things work similarly, developers can predict behavior without reading docs.

### Documentation Is the Product
An undocumented API is an unusable API. Documentation quality directly impacts adoption.

## Guidelines

### Match Status Codes to Reality
Status codes tell consumers what happened. Use the right code for the actual outcome.

```yaml
# Clear status codes
responses:
  200:
    description: Resource retrieved successfully
  404:
    description: Resource not found
  422:
    description: Validation failed (details in response body)
```

### Document Response Shapes
Every response should have a schema. Consumers need to know what they'll receive.

### Name Things Consistently
Pick a naming convention and stick with it. camelCase, snake_case — just be consistent.

### Provide Error Details
Generic error messages frustrate consumers. Include enough detail to diagnose the problem.

```yaml
# GOOD: Detailed error
error:
  code: VALIDATION_ERROR
  message: "Invalid request"
  details:
    - field: email
      issue: "Must be a valid email address"
      received: "not-an-email"
```

### Version Thoughtfully
Major version bumps should have clear migration paths. Deprecation timelines should be published.

### Include Examples
Working examples are worth pages of description. Show real request/response pairs.

## The Flexibility Principle

API design involves tradeoffs. REST isn't always best. GraphQL isn't always needed. Choose the approach that serves your consumers, not the one that follows trends.
