# Architecture Decision Records

Each `###` heading is a dedup key — deeper scopes override shallower ones with the same heading.

---

<!-- Add decisions below -->

### ADR-008: Remove Team & Members and Integrations tabs from Settings
- **Date**: 2026-03-10
- **Status**: accepted
- **Context**: Team & Members and Integrations tabs were placeholder/disabled features cluttering the settings sidebar
- **Decision**: Remove both tabs entirely — nav items, tab components, related interfaces, and icon components (~550 lines removed)
- **Consequences**: Settings modal now only has Plan & Billing and Preferences tabs. Tests updated accordingly. Pre-existing Credit Usage test failures remain (unrelated, from ADR-006).

### ADR-007: Remove Tracked button and LIVE badge from search nav
- **Date**: 2026-03-10
- **Status**: accepted
- **Context**: The search page header had a "Tracked (2)" button and a "LIVE" badge that were not needed in the navigation bar.
- **Decision**: Remove both elements from `DashboardHeader.tsx`. Remove the `onShowTracked` prop and its usage in `page.tsx`.
- **Files**: `app/search/components/DashboardHeader.tsx`, `app/search/page.tsx`
