# Civic Voices — Product Decisions

**Last updated:** February 2025

This document records key product and pricing decisions. It overrides any conflicting statements in vision.md or Master Prompt drafts.

---

## Pricing Model

**Decision:** One cost, no credits. Flat-rate subscription.

- **Tiers:** Pro ($99), Agency ($249), Business ($499)
- **No credit system** — remove credit deduction, credit packs, and credit usage UI
- **Price will increase over time** — plan UI and copy for future tier/price changes (e.g. "Prices may change with 30 days notice")
- **Included:** Searches and reports are unlimited within tier (or governed by search limits, not credits)

**Implementation impact:**
- Remove: `monthlyCredits`, `bonusCredits`, `creditsResetDate`, `CreditTransaction`, credit checks in search/report flows
- Simplify: Stripe subscription only, no overage or add-on packs
- Keep: Free tier (1 free search + 1 free report on signup)

---

## 311 Municipal Data

**Decision:** Plan for 311 integration. No ingestion until data is available.

**Architecture to prepare:**
- Add `ThreeElevenRequest` (or equivalent) model when schema is extended for taxonomy
- Document Charlotte open data portal (data.charlottenc.gov) as primary source
- Add integration points in taxonomy (311 signal topics ↔ subcategories)
- Note demographic bias in 311 data (higher-income areas report more) in tooltips/help
- Do **not** build ingestion jobs or ETL until you have access to data

**Placeholder:** When adding taxonomy tables, include `three_eleven_signals` on subcategories. Leave 311 table migration as a future step.

---

## Daily Emails for Tracked Issues

**Decision:** Users who track topics should receive daily digest emails by default (or via opt-in).

**Current state:**
- **Alert** — Search-query based, supports DAILY/WEEKLY/MONTHLY. Cron at `/api/cron/alerts` processes due alerts. Fully implemented.
- **TrackedTopic** — Saved topics (query string). No automatic email link. Used for onboarding defaults and dashboard display.

**Implementation options:**

| Option | Description | Effort |
|--------|-------------|--------|
| **A. Link TrackedTopic → Alert** | When user adds a TrackedTopic, prompt to create an Alert for that query with DAILY frequency. One Alert per TrackedTopic. | Low — mostly UI flow |
| **B. Add dailyDigest to TrackedTopic** | Add `dailyDigest Boolean`, `preferredTime`, `timezone` to TrackedTopic. New cron processes TrackedTopics with dailyDigest=true, runs search, sends digest. | Medium — new cron + schema |
| **C. Unify concepts** | Treat "tracked topic" as "alert with daily frequency". Merge TrackedTopic into Alert or vice versa. | Higher — schema migration |

**Recommendation:** Option A for fastest delivery. Option B if you want tracked topics to be independent of alerts (e.g. track without email, or email without full alert config).

**UX target:** "Track this topic" → user gets daily digest at preferred time, same format as existing Alert digest (summary, top posts, link to report).

---

## Summary

| Area | Decision |
|------|----------|
| Pricing | Flat-rate, no credits. Price may increase over time. |
| 311 data | Plan schema and integration points. No ingestion until data available. |
| Tracked issues emails | Daily digests for tracked topics. Link to existing Alert flow or add TrackedTopic-based cron. |
