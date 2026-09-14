# UI — Quality Guidelines

**Focus**: Interfaces that are accessible and usable by everyone.

## Quality Principles

### Accessibility Is Quality
If people with disabilities can't use it, it's not finished. Accessibility is a quality metric, not a nice-to-have.

### Usability Over Aesthetics
Beautiful interfaces that confuse users aren't good interfaces. Clarity beats cleverness.

### Consistency Builds Trust
When similar things work similarly, users build mental models that speed up interaction.

## Guidelines

### Ensure Readable Contrast
Text must be readable. WCAG guidelines provide minimum contrast ratios for a reason.

```css
/* Hard to read */
.text { color: #999; background: #fff; }  /* 2.85:1 - fails WCAG AA */

/* Easy to read */
.text { color: #595959; background: #fff; }  /* 7.0:1 - passes WCAG AAA */
```

### Make Focus Visible
Keyboard users need to see where focus is. Never remove focus indicators without providing an alternative.

```css
/* BAD */
button:focus { outline: none; }

/* GOOD */
button:focus { outline: 2px solid #005fcc; outline-offset: 2px; }
```

### Label Form Inputs
Inputs without labels are inaccessible to screen readers and confusing for everyone.

```html
<!-- Confusing -->
<input type="email" placeholder="Email">

<!-- Clear -->
<label for="email">Email address</label>
<input type="email" id="email" placeholder="you@example.com">
```

### Don't Autoplay Media
Auto-playing media surprises users and can cause accessibility issues.

### Use Semantic HTML
Semantic HTML provides accessibility for free. Use `<button>` instead of `<div onclick>`.

## The Flexibility Principle

Accessibility has hard requirements (WCAG) and soft preferences. Contrast ratios are requirements. Color choices are preferences. Focus on what matters for usability.
