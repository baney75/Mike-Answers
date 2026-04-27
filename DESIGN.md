# Mike Answers Design System

## Overview

Mike Answers is a conservative Christian AI tutoring interface designed for clarity, focus, and trust. The design prioritizes the user's task over decoration, using strong visual hierarchy and honest capability messaging.

## Design Philosophy

**Purpose before pattern.** Every design decision serves the user's goal of getting clear, truthful answers. The interface reduces cognitive load through visible hierarchy, strong grouping, and obvious next actions.

**Bounded rationality.** The design assumes users have limited attention, working memory, and time. Dense answer surfaces need chunking, clear typography, and progressive disclosure.

**Honest capabilities.** Provider capabilities are stated clearly. No implied features that don't exist.

## Tokens

### Colors

**Primary** - Deep Ink
- Token: `--color-primary`
- Value: `#7a1f34`
- Usage: Headlines, primary buttons, brand identity
- Reasoning: Maroon conveys authority, trust, and academic seriousness. Deep enough for readability on light backgrounds.

**Primary Dark** - Pressed State
- Token: `--color-primary-dark`
- Value: `#5c1727`
- Usage: Hover states, active buttons
- Reasoning: 15% darker than primary for clear interaction feedback.

**Primary Light** - Highlight
- Token: `--color-primary-light`
- Value: `#9c2a47`
- Usage: Active states, emphasis
- Reasoning: Lighter variant for hover and selection states.

**Accent** - Gold
- Token: `--color-accent`
- Value: `#d4a84b`
- Usage: Secondary actions, highlights, success states
- Reasoning: Gold complements maroon with warmth and optimism. Academic achievement color.

**Accent Dark** - Pressed
- Token: `--color-accent-dark`
- Value: `#b8923d`
- Usage: Accent hover states
- Reasoning: Darker variant for interaction feedback.

**Neutral** - Canvas
- Token: `--color-neutral-canvas`
- Value: `#ffffff`
- Usage: Page background
- Reasoning: White provides maximum contrast for text readability.

**Neutral** - Ink
- Token: `--color-neutral-ink`
- Value: `#111827`
- Usage: Body text
- Reasoning: Near-black for optimal reading contrast without harshness.

**Neutral** - Secondary
- Token: `--color-neutral-secondary`
- Value: `#6b7280`
- Usage: Secondary text, metadata
- Reasoning: Gray-500 for hierarchy without competing with primary content.

**Semantic** - Success
- Token: `--color-success`
- Value: `#22c55e`
- Usage: Success states, confirmations
- Reasoning: Standard green for positive feedback.

**Semantic** - Warning
- Token: `--color-warning`
- Value: `#f59e0b`
- Usage: Warnings, cautions
- Reasoning: Amber for attention without alarm.

**Semantic** - Error
- Token: `--color-error`
- Value: `#ef4444`
- Usage: Errors, failures
- Reasoning: Red for problems requiring action.

### Typography

**Font Family** - Sans
- Token: `--font-sans`
- Value: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- Usage: UI elements, body text
- Reasoning: System fonts for performance and familiarity. No custom font loading.

**Font Family** - Mono
- Token: `--font-mono`
- Value: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`
- Usage: Code blocks, technical content
- Reasoning: Monospace for code readability and technical accuracy.

**Size** - XS
- Token: `--text-xs`
- Value: `0.75rem` (12px)
- Usage: Captions, labels, metadata
- Reasoning: Minimum readable size for secondary information.

**Size** - SM
- Token: `--text-sm`
- Value: `0.875rem` (14px)
- Usage: Small text, button labels
- Reasoning: Slightly larger than XS for improved readability.

**Size** - Base
- Token: `--text-base`
- Value: `1rem` (16px)
- Usage: Body text, default
- Reasoning: Browser default for optimal readability.

**Size** - LG
- Token: `--text-lg`
- Value: `1.125rem` (18px)
- Usage: Large body, emphasis
- Reasoning: Increased size for hierarchy without heading scale.

**Size** - XL
- Token: `--text-xl`
- Value: `1.25rem` (20px)
- Usage: Subheadings, section titles
- Reasoning: Clear hierarchy below H1.

**Size** - 2XL
- Token: `--text-2xl`
- Value: `1.5rem` (24px)
- Usage: Headings, important labels
- Reasoning: Prominent without overwhelming.

**Size** - 3XL
- Token: `--text-3xl`
- Value: `1.875rem` (30px)
- Usage: Major headings
- Reasoning: Page-level importance.

**Size** - 4XL
- Token: `--text-4xl`
- Value: `2.25rem` (36px)
- Usage: Hero text, primary headlines
- Reasoning: Maximum impact for key messages.

**Weight** - Normal
- Token: `--font-normal`
- Value: `400`
- Usage: Body text
- Reasoning: Standard readability weight.

**Weight** - Medium
- Token: `--font-medium`
- Value: `500`
- Usage: Emphasis, labels
- Reasoning: Slight emphasis without bold heaviness.

**Weight** - Semibold
- Token: `--font-semibold`
- Value: `600`
- Usage: Headings, important text
- Reasoning: Clear hierarchy marker.

**Weight** - Bold
- Token: `--font-bold`
- Value: `700`
- Usage: Strong emphasis, headlines
- Reasoning: Maximum weight for key content.

**Weight** - Black
- Token: `--font-black`
- Value: `900`
- Usage: Brand emphasis, display text
- Reasoning: Extreme weight for brand moments.

### Spacing

**Unit** - 0
- Token: `--space-0`
- Value: `0`
- Usage: No spacing
- Reasoning: Base zero.

**Unit** - PX
- Token: `--space-px`
- Value: `1px`
- Usage: Borders, hairlines
- Reasoning: Single pixel precision.

**Unit** - 0.5
- Token: `--space-0-5`
- Value: `0.125rem` (2px)
- Usage: Tight spacing, icon margins
- Reasoning: Micro adjustments.

**Unit** - 1
- Token: `--space-1`
- Value: `0.25rem` (4px)
- Usage: Tight padding, gaps
- Reasoning: Base spacing unit.

**Unit** - 2
- Token: `--space-2`
- Value: `0.5rem` (8px)
- Usage: Standard padding, component gaps
- Reasoning: Default spacing for most elements.

**Unit** - 3
- Token: `--space-3`
- Value: `0.75rem` (12px)
- Usage: Section padding, card padding
- Reasoning: Increased spacing for grouping.

**Unit** - 4
- Token: `--space-4`
- Value: `1rem` (16px)
- Usage: Card padding, section margins
- Reasoning: Base relative spacing.

**Unit** - 6
- Token: `--space-6`
- Value: `1.5rem` (24px)
- Usage: Large gaps, section separation
- Reasoning: Major spacing for distinct sections.

**Unit** - 8
- Token: `--space-8`
- Value: `2rem` (32px)
- Usage: Page sections, major divisions
- Reasoning: Large structural spacing.

**Unit** - 12
- Token: `--space-12`
- Value: `3rem` (48px)
- Usage: Major page sections
- Reasoning: Significant structural separation.

**Unit** - 16
- Token: `--space-16`
- Value: `4rem` (64px)
- Usage: Hero sections, major breaks
- Reasoning: Maximum structural spacing.

### Border Radius

**None**
- Token: `--radius-none`
- Value: `0`
- Usage: Sharp corners
- Reasoning: Serious, academic aesthetic.

**SM**
- Token: `--radius-sm`
- Value: `0.125rem` (2px)
- Usage: Subtle rounding, inputs
- Reasoning: Minimal softness.

**Base**
- Token: `--radius`
- Value: `0.25rem` (4px)
- Usage: Buttons, small cards
- Reasoning: Standard interaction element rounding.

**MD**
- Token: `--radius-md`
- Value: `0.375rem` (6px)
- Usage: Cards, panels
- Reasoning: Clear rounded corners without excess.

**LG**
- Token: `--radius-lg`
- Value: `0.5rem` (8px)
- Usage: Large cards, modals
- Reasoning: Prominent rounding for elevated elements.

**XL**
- Token: `--radius-xl`
- Value: `0.75rem` (12px)
- Usage: Feature cards, hero elements
- Reasoning: Maximum standard rounding.

**Full**
- Token: `--radius-full`
- Value: `9999px`
- Usage: Pills, badges, circular elements
- Reasoning: Complete rounding for special elements.

### Shadows

**None**
- Token: `--shadow-none`
- Value: `none`
- Usage: Flat elements
- Reasoning: Clean, flat aesthetic preference.

**SM**
- Token: `--shadow-sm`
- Value: `0 1px 2px 0 rgb(0 0 0 / 0.05)`
- Usage: Subtle elevation, inputs
- Reasoning: Minimal depth without distraction.

**Base**
- Token: `--shadow`
- Value: `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`
- Usage: Cards, buttons
- Reasoning: Standard elevation for interactive elements.

**MD**
- Token: `--shadow-md`
- Value: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`
- Usage: Elevated cards, dropdowns
- Reasoning: Clear elevation for floating elements.

**LG**
- Token: `--shadow-lg`
- Value: `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`
- Usage: Modals, popovers
- Reasoning: Maximum standard elevation.

## Components

### Button Primary

**Background**
- Token: `--button-primary-bg`
- Value: `var(--color-primary)`
- Reasoning: Primary brand color for main actions.

**Background Hover**
- Token: `--button-primary-bg-hover`
- Value: `var(--color-primary-dark)`
- Reasoning: Darker state for interaction feedback.

**Text**
- Token: `--button-primary-text`
- Value: `#ffffff`
- Reasoning: White for maximum contrast on maroon.

**Padding**
- Token: `--button-primary-padding`
- Value: `var(--space-2) var(--space-4)`
- Reasoning: Comfortable click target with horizontal emphasis.

**Border Radius**
- Token: `--button-primary-radius`
- Value: `var(--radius)`
- Reasoning: Standard button rounding.

**Font**
- Token: `--button-primary-font`
- Value: `var(--font-semibold) var(--text-sm) var(--font-sans)`
- Reasoning: Semibold for importance, small size for UI density.

### Button Secondary

**Background**
- Token: `--button-secondary-bg`
- Value: `#ffffff`
- Reasoning: White background for lower emphasis.

**Border**
- Token: `--button-secondary-border`
- Value: `1px solid var(--color-primary)`
- Reasoning: Maroon border maintains brand connection.

**Text**
- Token: `--button-secondary-text`
- Value: `var(--color-primary)`
- Reasoning: Maroon text for brand consistency.

**Background Hover**
- Token: `--button-secondary-bg-hover`
- Value: `var(--color-primary-light)/10`
- Reasoning: Subtle maroon tint on hover.

**Padding**
- Token: `--button-secondary-padding`
- Value: `var(--space-2) var(--space-4)`
- Reasoning: Same as primary for consistency.

### Card

**Background**
- Token: `--card-bg`
- Value: `#ffffff`
- Reasoning: White cards on neutral backgrounds.

**Border**
- Token: `--card-border`
- Value: `1px solid rgb(0 0 0 / 0.1)`
- Reasoning: Subtle border for definition.

**Border Radius**
- Token: `--card-radius`
- Value: `var(--radius-lg)`
- Reasoning: Prominent rounding for elevated feel.

**Shadow**
- Token: `--card-shadow`
- Value: `var(--shadow)`
- Reasoning: Standard elevation for cards.

**Padding**
- Token: `--card-padding`
- Value: `var(--space-4)`
- Reasoning: Comfortable internal spacing.

### Input

**Background**
- Token: `--input-bg`
- Value: `#ffffff`
- Reasoning: White input fields.

**Border**
- Token: `--input-border`
- Value: `1px solid rgb(0 0 0 / 0.2)`
- Reasoning: Clear border for form affordance.

**Border Focus**
- Token: `--input-border-focus`
- Value: `var(--color-primary)`
- Reasoning: Maroon focus ring for brand consistency.

**Border Radius**
- Token: `--input-radius`
- Value: `var(--radius-md)`
- Reasoning: Standard input rounding.

**Padding**
- Token: `--input-padding`
- Value: `var(--space-2) var(--space-3)`
- Reasoning: Comfortable typing space.

**Font**
- Token: `--input-font`
- Value: `var(--font-normal) var(--text-base) var(--font-sans)`
- Reasoning: Standard body text for inputs.

## Layout Principles

### Single Screen Constraint
- Application locked to `100dvh`
- Zero global body scrolling
- Long content scrolls in `overflow-y-auto` panels
- Follow-up composer pinned and always visible

### Responsive Breakpoints
- SM: 640px (mobile landscape)
- MD: 768px (tablet)
- LG: 1024px (desktop)
- XL: 1280px (large desktop)
- 2XL: 1536px (ultra-wide)

### Typography Hierarchy
- Headlines: `var(--font-black) var(--text-4xl)`
- H1: `var(--font-bold) var(--text-3xl)`
- H2: `var(--font-semibold) var(--text-2xl)`
- H3: `var(--font-semibold) var(--text-xl)`
- Body: `var(--font-normal) var(--text-base)`
- Small: `var(--font-normal) var(--text-sm)`
- Caption: `var(--font-medium) var(--text-xs)`

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

## Specification Compliance

This DESIGN.md follows the DESIGN.md specification v1.0:
- [x] Tokens section with reasoning and values
- [x] Components section with role-based references
- [x] Primary color defined
- [x] Neutral color defined
- [x] Semantic colors defined
- [x] Typography tokens defined
- [x] Spacing tokens defined
- [x] Border radius tokens defined
- [x] Shadow tokens defined

---

Last updated: 2026-04-24
Version: 1.0
