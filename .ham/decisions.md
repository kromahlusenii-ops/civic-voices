# Architecture Decision Records

Each `###` heading is a dedup key — deeper scopes override shallower ones with the same heading.

---

<!-- Add decisions below -->

### Replaced KEYS-based Redis wildcard operations with SCAN-based iteration and batched deletions in the shared cache helper.
- **Status**: accepted
- **Date**: 2026-03-11
- **Decision**: Use incremental Redis SCAN plus batched DEL for pattern invalidation and cache stats to avoid full keyspace KEYS lookups as cache volume grows.

### Fixed multiple stale test suites and test helpers, including Redis-related route tests, query suggestions, report page mocks, and several smaller assertion mismatches; identified remaining broader search page test drift.
- **Status**: accepted
- **Date**: 2026-03-11
- **Decision**: Use minimal test-only changes where possible: refresh stale mocks, reset shared in-memory state between tests, and align assertions with current UI behavior before changing production code.