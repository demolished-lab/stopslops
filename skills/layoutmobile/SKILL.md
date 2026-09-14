# Layout Mobile — Quality Guidelines

**Focus**: Layouts that work on all screen sizes.

## Quality Principles

### Responsive Is Not Optional
Users access websites on phones, tablets, and desktops. Responsive design serves everyone.

### Content Drives Layout
Let content determine layout, not the other way around. Fixed widths break when content changes.

### Touch Targets Matter
On mobile, fingers are less precise than mouse pointers. Make interactive elements big enough to tap.

## Guidelines

### Use Responsive Units
Fixed pixel widths break on different screen sizes. Use responsive units.

```css
/* Breaks on mobile */
.container { width: 960px; }

/* Works everywhere */
.container { max-width: 960px; width: 100%; }
```

### Add Viewport Meta
Mobile browsers need to know how to scale your page.

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

### Prevent Horizontal Scroll
Content wider than the viewport forces horizontal scrolling. Avoid it.

```css
.content { max-width: 100%; overflow-x: hidden; }
```

### Make Touch Targets Large Enough
WCAG recommends minimum 44x44px for touch targets.

```css
.button { min-width: 44px; min-height: 44px; }
```

### Use Multiple Breakpoints
One breakpoint isn't enough. Design for phone, tablet, and desktop.

```css
@media (max-width: 480px) { /* Phone */ }
@media (max-width: 768px) { /* Tablet */ }
@media (max-width: 1024px) { /* Desktop */ }
```

### Use Relative Font Sizes
Fixed pixel font sizes don't scale with user preferences. Use rem or em.

```css
/* Doesn't scale */
.text { font-size: 14px; }

/* Scales with user preferences */
.text { font-size: 0.875rem; }
```

## The Flexibility Principle

Responsive design has many valid approaches. Mobile-first, desktop-first, fluid typography — choose what works for your project. The goal is that content is accessible on all devices.
