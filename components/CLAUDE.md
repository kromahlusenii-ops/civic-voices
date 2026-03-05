# components — Root-Level Shared Components

## Purpose
Components shared outside the app/ directory (e.g., SettingsModal).

## Conventions
- `"use client"` — all components here use browser APIs
- SettingsModal.tsx — user settings, preferences, account management
  - Preferences tab includes: focus area, legislative dashboard location, **tracked topics** (category accordion with subcategory checkboxes)
  - `onTopicsChange` prop propagates topic selections to the search dashboard in real-time
  - `TrackedTopicsSection` is a self-contained component inside SettingsModal that fetches/saves via `/api/topics`
