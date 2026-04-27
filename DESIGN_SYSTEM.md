# Mike Answers Design System

**Last Updated:** 2026-04-24
**Version:** 1.0

---

## Overview

The Mike Answers design system provides a consistent visual language for the tutoring application. It follows the principles of **purpose-first design** and **bounded rationality** to help users understand, decide, and continue tasks with minimal friction.

---

## Core Principles

### 1. Purpose Before Pattern
Every design decision should serve the user's task. Decoration is only allowed when it strengthens hierarchy or brand recognition without slowing task entry.

### 2. Recognition Over Recall
Make information immediately visible rather than requiring users to remember it. Use visible hierarchy, strong grouping, and clear next actions.

### 3. One-Screen Default
The core task should fit on one screen without vertical page scroll by default. Long content should scroll inside dedicated panels.

### 4. Cognitive Load Management
Protect working memory aggressively:
- Chunk dense answers into 4 or fewer core ideas per visual block
- Use retrieval cues instead of just exposition
- Pair words with diagrams (dual coding)

### 5. Honest Capabilities
Provider capabilities are stated clearly. No implied features that don't exist (especially for MiniMax browser image/audio).

---

## Color Palette

### Brand Colors

```typescript
brand: {
  maroon: "#7a1f34",      // Primary brand color
  maroonDark: "#5c1727",  // Hover states
  maroonLight: "#9c2a47", // Active states
  gold: "#d4a84b",        // Accent color
  goldDark: "#b8923d",    // Accent hover
  goldLight: "#e8c078",   // Accent active
}
```

**Usage:**
- Maroon: Primary buttons, headers, brand elements
- Gold: Accent elements, highlights, important information

### Semantic Colors

```typescript
semantic: {
  success: "#22c55e",  // Confirmations, valid states
  warning: "#f59e0b",  // Warnings, cautions
  error: "#ef4444",    // Errors, failures
  info: "#3b82f6",     // Information, tips
}
```

### Neutral Scale

```typescript
neutral: {
  white: "#ffffff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  black: "#000000",
}
```

**Usage:**
- Gray100-200: Backgrounds, borders
- Gray300-400: Secondary text, icons
- Gray500-600: Body text
- Gray700-900: Headers, important text

---

## Typography

### Font Families

```typescript
fontFamily: {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
}
```

### Font Sizes

```typescript
fontSize: {
  xs: "0.75rem",    // 12px - Captions, labels
  sm: "0.875rem",   // 14px - Small text
  base: "1rem",     // 16px - Body text
  lg: "1.125rem",   // 18px - Large body
  xl: "1.25rem",    // 20px - Subheadings
  "2xl": "1.5rem",  // 24px - Headings
  "3xl": "1.875rem",// 30px - Large headings
  "4xl": "2.25rem", // 36px - Display
}
```

### Font Weights

```typescript
fontWeight: {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  black: "900",
}
```

### Line Heights

```typescript
lineHeight: {
  none: "1",
  tight: "1.25",
  normal: "1.5",
  relaxed: "1.625",
  loose: "2",
}
```

---

## Spacing Scale

```typescript
spacing: {
  px: "1px",
  0: "0",
  0.5: "0.125rem",   // 2px
  1: "0.25rem",      // 4px
  1.5: "0.375rem",   // 6px
  2: "0.5rem",       // 8px
  3: "0.75rem",      // 12px
  4: "1rem",         // 16px
  5: "1.25rem",      // 20px
  6: "1.5rem",       // 24px
  8: "2rem",         // 32px
  10: "2.5rem",      // 40px
  12: "3rem",        // 48px
  16: "4rem",        // 64px
}
```

**Usage:**
- `spacing[1]` (4px): Tight spacing, icon margins
- `spacing[2]` (8px): Standard padding, gaps
- `spacing[4]` (16px): Card padding, section spacing
- `spacing[6]` (24px): Section margins, large gaps

---

## Border Radius

```typescript
borderRadius: {
  none: "0",
  sm: "0.125rem",    // 2px
  DEFAULT: "0.25rem",// 4px
  md: "0.375rem",    // 6px
  lg: "0.5rem",      // 8px
  xl: "0.75rem",     // 12px
  "2xl": "1rem",     // 16px
  full: "9999px",
}
```

**Usage:**
- `sm` / `DEFAULT`: Small elements, inputs
- `md`: Buttons, cards
- `lg`: Large cards, modals
- `xl`: Hero sections

---

## Shadows

```typescript
shadows: {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
}
```

**Usage:**
- `sm`: Subtle elevation for small elements
- `DEFAULT`: Standard cards, buttons
- `md`: Elevated cards, dropdowns
- `lg`: Modals, popovers

---

## Component Patterns

### Buttons

**Variants:**
- Primary: Maroon background, gold text
- Secondary: White background, maroon border
- Ghost: Transparent, maroon text

**Sizes:**
- Sm: `spacing[2]` padding, `fontSize.sm`
- Default: `spacing[2.5]` padding, `fontSize.base`
- Lg: `spacing[3]` padding, `fontSize.lg`

### Cards

```typescript
card: {
  padding: {
    DEFAULT: `${spacing[4]}`,
    lg: `${spacing[6]}`,
  },
  borderRadius: borderRadius.lg,
  boxShadow: shadows.DEFAULT,
}
```

### Inputs

```typescript
input: {
  padding: {
    sm: `${spacing[2]}`,
    DEFAULT: `${spacing[2.5]}`,
    lg: `${spacing[3]}`,
  },
  borderRadius: borderRadius.md,
}
```

---

## Layout Rules

### One-Screen Constraint
- Application locked to `100dvh`
- Zero global body scrolling
- Long content scrolls inside `overflow-y-auto` panels
- Follow-up composer pinned and always visible

### Responsive Breakpoints

```typescript
breakpoints: {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
}
```

### Home Layout
- **Desktop:** Two-column with composer dominant
- **Tablet/Mobile:** Single-column stack
- Daily Desk accessible via single entry point

### Solve Layout
- Reading column for answer and transcript
- Pinned follow-up dock at bottom
- Action bar for solve actions

---

## Accessibility

### Color Contrast
- Normal text: 4.5:1 minimum (WCAG AA)
- Large text: 3:1 minimum (WCAG AA)
- Interactive elements: Visible focus states

### Keyboard Navigation
- Enter: Submit with fast mode
- Shift+Enter: Insert newline
- Escape: Clear draft or exit
- Tab: Navigate between interactive elements

### Focus Management
- Visible focus rings on all interactive elements
- Logical tab order
- No keyboard traps

---

## Dark Mode

### Implementation
- Use CSS custom properties for theme colors
- Apply `.dark` class to root element
- Store preference in `localStorage['aqs_theme']`

### Theme Variables
```css
:root {
  --aqs-ink: #111827;
  --aqs-background: #ffffff;
  --aqs-card: #ffffff;
}

.dark {
  --aqs-ink: #f9fafb;
  --aqs-background: #111827;
  --aqs-card: #1f2937;
}
```

---

## Print Styles

### Print Considerations
- Hide interactive chrome via `.no-print`
- Remove grid/shadow effects
- Set tighter page margins
- Avoid splitting major cards across pages
- Print links with URLs

---

## Design Tokens Reference

All design tokens are exported from `src/design-tokens.ts`:

```typescript
import tokens from "./design-tokens";

// Usage
tokens.colors.brand.maroon
tokens.typography.fontSize["2xl"]
tokens.spacing[4]
tokens.borderRadius.lg
```

---

## Testing

### Visual Verification
- [ ] Check all breakpoints (mobile, tablet, desktop)
- [ ] Verify color contrast ratios
- [ ] Test focus states
- [ ] Verify dark mode
- [ ] Check print styles

### Accessibility Audit
- [ ] Run axe-core or similar tool
- [ ] Test with screen readers
- [ ] Verify keyboard navigation
- [ ] Check color contrast

---

## Version History

- **v1.0** (2026-04-24): Initial design system documentation

---

**Next Review:** 2026-05-24
