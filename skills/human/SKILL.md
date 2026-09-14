# Human — Quality Guidelines

**Focus**: Experiences that work for all people.

## Quality Principles

### Design for Everyone
Accessibility isn't a feature — it's a quality standard. If people with disabilities can't use it, it's not finished.

### Keyboard Navigation Is Essential
Not everyone uses a mouse. Keyboard accessibility is a requirement, not a preference.

### Clear Feedback Helps Everyone
Clear error messages, loading states, and confirmations help all users, not just those with disabilities.

## Guidelines

### Support Keyboard Navigation
All interactive elements must be keyboard accessible.

```html
<!-- Not keyboard accessible -->
<div onclick="handleClick()">Click me</div>

<!-- Keyboard accessible -->
<button onclick="handleClick()">Click me</button>
```

### Provide ARIA Labels
Screen readers need labels to explain what elements do.

```html
<!-- Unlabeled -->
<button><svg>...</svg></button>

<!-- Labeled -->
<button aria-label="Close dialog"><svg>...</svg></button>
```

### Add Skip Links
Let keyboard users skip repetitive navigation.

```html
<a href="#main" class="skip-link">Skip to content</a>
```

### Set Language Attribute
Screen readers need to know what language content is in.

```html
<html lang="en">
```

### Show Form Errors Clearly
Form validation errors should be visible and accessible.

```html
<input type="email" aria-invalid="true" aria-describedby="email-error">
<span id="email-error" role="alert">Please enter a valid email</span>
```

### Don't Rely on Color Alone
Color shouldn't be the only way to convey information. Add text, icons, or patterns.

```css
/* Only uses color */
.error { color: red; }

/* Uses multiple indicators */
.error { color: red; font-weight: bold; }
.error::before { content: "Error: "; }
```

## The Flexibility Principle

Accessibility has hard requirements (WCAG) and soft preferences. Contrast ratios and keyboard navigation are requirements. Color choices and animation preferences are softer. Focus on what matters for usability.
