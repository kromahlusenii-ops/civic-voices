# components — Root-Level Shared Components

## Purpose
Components shared outside the app/ directory (e.g., SettingsModal).

## Conventions
- `"use client"` — all components here use browser APIs
- SettingsModal.tsx — user settings, preferences, account management
  - Preferences tab includes: focus area, legislative dashboard location, **tracked topics** (category accordion with subcategory checkboxes)
  - `onTopicsChange` prop propagates topic selections to the search dashboard in real-time
  - `TrackedTopicsSection` is a self-contained component inside SettingsModal that fetches/saves via `/api/topics`
  - CreditUsageTab was removed (ADR-006) — default tab is now `plan_billing`
  - Plan feature lists show "Unlimited searches" instead of "X credits/month"


<!-- ham:section:conventions -->
## Conventions
- Prefer small, composable components over large monolithic ones
- Props interfaces should be exported alongside the component
- Use Tailwind utility classes — do not introduce inline styles or separate CSS
- Co-locate styles, tests, and stories with their component when possible
- Interactive components should be accessible (keyboard navigation, ARIA labels)
- Prefer functional components and hooks
<!-- /ham:section:conventions -->