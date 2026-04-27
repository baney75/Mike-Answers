# Design Audit: AnyQuestionSolver (Mike Answers)

**Date:** 2026-04-24
**Auditor:** Phylax
**Project:** AnyQuestionSolver (Mike Answers)

---

## Executive Summary

**Overall Design Quality:** ⚠️ GOOD with room for improvement

The AnyQuestionSolver project demonstrates a well-structured, user-centered design with clear architectural patterns. However, several areas require attention to prevent future technical debt and maintain design consistency.

**Key Strengths:**
- Strong state machine architecture in `App.tsx`
- Provider-registry pattern for AI integrations
- Clear separation of concerns (components, services, hooks, utils)
- User-centered design with bounded rationality principles
- Single-screen layout constraint enforced

**Key Concerns:**
- Component complexity in `App.tsx` (1362+ lines)
- State duplication risk in multiple components
- No explicit design system documentation
- Limited component composition patterns documented

---

## 1. Architecture Design Audit

### 1.1 State Machine Design

**Current State:** ✅ EXCELLENT

The application uses a well-defined 7-state machine in `App.tsx`:

```
IDLE → PREVIEWING → LOADING → SOLVED/ERROR
                              ↓
                    NEWS / WOTD branches
```

**Strengths:**
- Clear state transitions documented in ARCHITECTURE.md
- Single source of truth for app state
- Proper handling of background tasks and saved states
- Follow-up context preservation built into the architecture

**Concerns:**
- `App.tsx` is 1362+ lines — approaching maintainability limits
- State machine logic is mixed with UI rendering concerns
- No explicit state machine testing documented

**Recommendation:** Consider extracting state machine logic into a dedicated hook or service layer.

---

### 1.2 Provider Architecture

**Current State:** ✅ EXCELLENT

Provider-registry pattern is well-implemented:

- `src/services/providers/registry.ts` defines provider capabilities
- Normalized settings shape prevents schema churn
- Capability flags for grounding, image input, audio, etc.

**Strengths:**
- Clear separation between provider descriptors and runtime configs
- Honest capability messaging (especially for MiniMax limitations)
- Fallback system for model failures

**Concerns:**
- Provider capability checks are scattered across multiple services
- No centralized capability validation layer

**Recommendation:** Create a `useProviderCapabilities` hook to centralize capability checks.

---

### 1.3 Component Architecture

**Current State:** ⚠️ GOOD with concerns

**Directory Structure:**
```
src/
├── components/
│   ├── home/          # Home-specific components
│   ├── setup/         # Provider setup components
│   └── [root]         # Shared components
├── hooks/             # Custom React hooks
├── services/          # External integrations
├── utils/             # Pure utilities
└── constants/         # App constants
```

**Strengths:**
- Clear separation by feature area
- Lazy loading for heavy components (SolveWorkspace, HistorySidebar, etc.)
- Workspace pattern for different app surfaces

**Concerns:**
- `App.tsx` handles too many responsibilities (state, routing, keyboard, persistence)
- Component composition patterns not explicitly documented
- No clear pattern for shared component state

**Recommendation:** Extract App.tsx responsibilities:
- State machine → custom hook
- Keyboard handling → custom hook
- Persistence → custom hook/service

---

## 2. UI/UX Design Audit

### 2.1 Layout System

**Current State:** ✅ EXCELLENT

The single-screen constraint (`100dvh`) is properly enforced:

- Zero global body scrolling
- Internal overflow panels for long content
- Pinned follow-up composer always visible

**Strengths:**
- Clear layout invariant documented in AGENTS.md
- Responsive design with desktop/tablet/mobile breakpoints
- Proper viewport locking prevents layout shifts

**Concerns:**
- No explicit design tokens or spacing system documented
- Theme flashing prevention only mentioned in AGENTS.md, not implemented in code

**Recommendation:** 
- Document design tokens in `src/design-tokens.ts`
- Implement theme pre-resolution in `index.html`

---

### 2.2 Visual Language

**Current State:** ⚠️ GOOD but undocumented

**Observed Patterns:**
- Maroon brand surface (mentioned in AGENTS.md)
- Strong outlines on cards
- Dense, readable layouts
- Pinned-composer workflow

**Strengths:**
- Consistent visual hierarchy
- Clear focus states
- Proper typography scaling

**Concerns:**
- No formal design system documentation
- Visual tokens scattered across CSS files
- No component library or pattern documentation

**Recommendation:** Create `DESIGN_SYSTEM.md` documenting:
- Color palette and usage
- Typography scale
- Spacing system
- Component patterns
- Interactive states

---

### 2.3 Accessibility

**Current State:** ⚠️ NEEDS IMPROVEMENT

**Observed:**
- Focus states visible
- Keyboard navigation supported (Enter, Shift+Enter, Escape)
- ARIA roles mentioned in components

**Missing:**
- No explicit WCAG compliance documentation
- No color contrast verification
- No screen reader testing documented
- No keyboard trap prevention documented

**Recommendation:** Add accessibility checklist to verification commands:
- Run accessibility audit (axe-core or similar)
- Test with screen readers
- Verify color contrast ratios
- Document keyboard navigation patterns

---

## 3. Code Quality Audit

### 3.1 Component Complexity

**Current State:** ⚠️ CONCERN

| Component | Lines | Concern Level |
|-----------|-------|---------------|
| `App.tsx` | 1362+ | 🔴 HIGH |
| `ARCHITECTURE.md` | 515+ | 🟡 MEDIUM |
| `AGENTS.md` | 150+ | 🟡 MEDIUM |

**Concerns:**
- `App.tsx` is approaching maintainability limits
- Single responsibility principle violation
- Hard to test in isolation
- Difficult for new contributors to understand

**Recommendation:** Refactor `App.tsx`:
1. Extract state machine to `useAppState.ts`
2. Extract keyboard handling to `useKeyboard.ts`
3. Extract persistence to `usePersistence.ts`
4. Extract routing to `useAppRouting.ts`

---

### 3.2 State Management

**Current State:** ⚠️ GOOD with duplication risk

**Current Pattern:**
- Local component state for UI concerns
- `useHistory` hook for solution history
- `useAISettings` for provider settings
- `useFilePreview` for image preview

**Concerns:**
- State duplication risk across components
- No explicit state normalization pattern
- History items contain redundant data

**Recommendation:**
- Document state normalization patterns
- Create `useNormalizedState` hook
- Add state validation on persistence

---

### 3.3 Testing Coverage

**Current State:** ⚠️ NEEDS IMPROVEMENT

**Existing Tests:**
- `src/utils/image.test.ts`
- `src/utils/input.test.ts`
- `src/utils/solution.test.ts`
- `src/utils/request.test.ts`
- `src/services/gemini.test.ts`
- `src/services/ai.test.ts`
- `src/services/providers/registry.test.ts`
- `src/services/news.test.ts`
- `src/services/wotd.test.ts`

**Missing:**
- Component tests (no `.test.tsx` files visible)
- State machine tests
- Integration tests
- E2E tests for critical flows

**Recommendation:**
- Add component tests for critical components
- Add state machine transition tests
- Add integration tests for provider flows
- Add Playwright E2E tests for critical user journeys

---

## 4. Design Issues & Fixes

### 4.1 Issue: App.tsx Complexity

**Problem:** `App.tsx` is 1362+ lines with mixed responsibilities

**Impact:** 
- Difficult to maintain
- Hard to test
- Steep learning curve for new contributors

**Fix Plan:**
1. Extract state machine logic to `src/hooks/useAppState.ts`
2. Extract keyboard handling to `src/hooks/useKeyboard.ts`
3. Extract persistence logic to `src/hooks/usePersistence.ts`
4. Extract routing logic to `src/hooks/useAppRouting.ts`
5. Keep `App.tsx` as orchestration layer only

**Priority:** 🔴 HIGH

---

### 4.2 Issue: No Design System Documentation

**Problem:** Visual patterns are scattered and undocumented

**Impact:**
- Inconsistent implementation risk
- Hard to maintain visual consistency
- No reference for new components

**Fix Plan:**
1. Create `src/design-tokens.ts` with color, spacing, typography
2. Create `DESIGN_SYSTEM.md` documenting patterns
3. Document component composition patterns
4. Add visual regression testing

**Priority:** 🟡 MEDIUM

---

### 4.3 Issue: Theme Flashing Prevention

**Problem:** Theme flashing prevention mentioned in AGENTS.md but not implemented

**Impact:**
- Poor user experience on initial load
- Layout shift during theme resolution

**Fix Plan:**
1. Add inline script in `index.html` to resolve theme before React mounts
2. Store theme preference in `localStorage['aqs_theme']`
3. Apply theme class immediately on page load

**Priority:** 🟡 MEDIUM

---

### 4.4 Issue: Provider Capability Checks Scattered

**Problem:** Capability checks are in multiple services

**Impact:**
- Duplication risk
- Inconsistent validation
- Hard to extend

**Fix Plan:**
1. Create `useProviderCapabilities` hook
2. Centralize capability validation
3. Add capability caching for performance

**Priority:** 🟡 MEDIUM

---

### 4.5 Issue: No Component Composition Patterns

**Problem:** No documented patterns for component composition

**Impact:**
- Inconsistent component patterns
- Hard to scale
- Difficult for new contributors

**Fix Plan:**
1. Document composition patterns in `ARCHITECTURE.md`
2. Create component examples directory
3. Add composition tests

**Priority:** 🟡 MEDIUM

---

## 5. Verification & Testing Plan

### 5.1 Code Quality Gates

Before claiming any design fix complete:

```bash
# 1. Lint
bun lint

# 2. Test
bun test src/utils/image.test.ts src/utils/input.test.ts \
  src/utils/solution.test.ts src/utils/request.test.ts \
  src/services/gemini.test.ts src/services/ai.test.ts \
  src/services/providers/registry.test.ts \
  src/services/news.test.ts src/services/wotd.test.ts

# 3. Build
bun run build
```

### 5.2 Browser Verification

For UI changes, verify in browser:

- [ ] No console errors or hydration warnings
- [ ] Keyboard behavior works (Enter, Shift+Enter, Escape)
- [ ] No clipped or overlapping layouts at mobile/tablet/desktop
- [ ] No accidental horizontal overflow
- [ ] Pinned follow-up input remains visible
- [ ] Focus states visible and accessible
- [ ] Dark theme boots without flashing

### 5.3 Design Verification

For design system changes:

- [ ] Color contrast meets WCAG AA (4.5:1 for normal text)
- [ ] Typography scale is consistent
- [ ] Spacing system is applied consistently
- [ ] Component patterns are reusable
- [ ] Visual regression tests pass

---

## 6. Priority Implementation Plan

### Phase 1: Architecture Refactoring (HIGH Priority)

**Week 1:**
1. Extract state machine from App.tsx
2. Extract keyboard handling from App.tsx
3. Extract persistence from App.tsx
4. Verify all tests pass

**Week 2:**
1. Create provider capabilities hook
2. Refactor provider capability checks
3. Add capability validation tests

### Phase 2: Design System (MEDIUM Priority)

**Week 3:**
1. Document design tokens
2. Create DESIGN_SYSTEM.md
3. Add theme pre-resolution to index.html
4. Add visual regression tests

### Phase 3: Component Patterns (MEDIUM Priority)

**Week 4:**
1. Document component composition patterns
2. Create component examples
3. Add composition tests
4. Update ARCHITECTURE.md

### Phase 4: Accessibility (MEDIUM Priority)

**Week 5:**
1. Run accessibility audit
2. Fix accessibility issues
3. Add accessibility tests
4. Document keyboard navigation

---

## 7. Success Metrics

### 7.1 Code Quality Metrics

- App.tsx lines reduced to < 500
- Component test coverage > 80%
- No state duplication across components
- All verification commands pass

### 7.2 Design Quality Metrics

- Design system documented
- Theme flashing eliminated
- Consistent visual language across components
- Accessibility compliance verified

### 7.3 User Experience Metrics

- No layout shifts during theme changes
- Consistent keyboard navigation
- Clear visual hierarchy
- Proper focus management

---

## 8. Conclusion

The AnyQuestionSolver project has a solid foundation with well-thought-out architecture and user-centered design. The main concerns are:

1. **App.tsx complexity** — needs refactoring for maintainability
2. **Design system documentation** — needs formalization
3. **Component patterns** — needs documentation

By following the implementation plan above, the project can achieve:
- Better maintainability through smaller, focused components
- Consistent visual language through documented design tokens
- Improved accessibility through systematic testing
- Faster onboarding through clear component patterns

**Next Action:** Begin Phase 1 refactoring with state machine extraction.

---

**Audit Completed:** 2026-04-24
**Auditor:** Phylax
**Next Review:** 2026-05-08 (2 weeks)
