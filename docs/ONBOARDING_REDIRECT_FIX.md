# Onboarding Redirect & Dashboard Crash Fix

## Issues Fixed

### 1. Dashboard Crash on Load
**Error:**
```
TypeError: Cannot read properties of undefined (reading 'reduce')
Line 77: const groupedTopics = topics?.selectedTopics.reduce(...)
```

**Root Cause:**
- API endpoint `/api/topics` was returning `{ topics: [...] }` 
- But dashboard page expected `{ selectedTopics: [...] }`
- Field name mismatch caused `topics.selectedTopics` to be `undefined`

### 2. Wrong Post-Onboarding Destination
**Issue:** After completing onboarding, users were redirected to `/dashboard` instead of `/search`

**User Expectation:** Go directly to search page to start using the app

## Fixes Applied

### 1. Fixed API Response Field Names (`/app/api/topics/route.ts`)

**Before:**
```typescript
return NextResponse.json({
  topics: user.selectedTopics || [],  // ❌ Wrong field name
  geoScope: user.geoScope || null,
  geoState: user.geoState || null,
  geoCity: user.geoCity || null,
})
```

**After:**
```typescript
return NextResponse.json({
  selectedTopics: user.selectedTopics || [],  // ✅ Matches dashboard expectation
  geoScope: user.geoScope || null,
  geoState: user.geoState || null,
  geoCity: user.geoCity || null,
})
```

### 2. Changed Onboarding Redirect (`/app/onboarding/page.tsx`)

**Before:**
```typescript
if (!response.ok) throw new Error('Failed to complete onboarding')

// Success! Redirect to personalized dashboard (no query params for security)
router.push('/dashboard')
```

**After:**
```typescript
if (!response.ok) throw new Error('Failed to complete onboarding')

// Success! Redirect to search page
window.location.href = '/search'
```

### 3. Added Null Safety Checks (`/app/dashboard/page.tsx`)

**Before:**
```typescript
const groupedTopics = topics?.selectedTopics.reduce(...)  // ❌ Crashes if selectedTopics is null
if (!topics || topics.selectedTopics.length === 0) {      // ❌ Crashes if selectedTopics is null
```

**After:**
```typescript
const groupedTopics = topics?.selectedTopics?.reduce(...)     // ✅ Safe
if (!topics || !topics.selectedTopics || topics.selectedTopics.length === 0) {  // ✅ Safe
```

## User Flow (Updated)

1. User signs up → `/signup`
2. User completes onboarding → `/onboarding`
3. User clicks "Launch Dashboard" → **Redirects to `/search`** ✅
4. User can start searching immediately

## Dashboard Access

The dashboard at `/dashboard` is still accessible:
- User can navigate to it from the search page if needed
- Shows personalized topic cards for quick searches
- But it's no longer the default post-onboarding destination

## Testing

To verify the fix:
1. Complete sign up flow
2. Select role, topics, and geographic scope
3. Click "Launch Dashboard" on review screen
4. ✅ Should redirect to `/search` (not `/dashboard`)
5. ✅ No crashes or errors

To test dashboard separately:
1. After onboarding, navigate to `/dashboard` manually
2. ✅ Should load without crashing
3. ✅ Should show selected topics grouped by category

## Why Use `/search` as Default?

1. **Immediate value**: Users want to search right away
2. **Clear purpose**: Search page is the core functionality
3. **No confusion**: Dashboard might seem like a "settings" page
4. **Better onboarding**: Drops users into the main experience

---

**Fixed:** 2026-02-18  
**Issues:** Dashboard crash + wrong redirect destination  
**Impact:** All users completing onboarding were seeing crashes
