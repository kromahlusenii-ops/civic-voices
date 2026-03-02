# Forced Authentication Flow - Implemented ✅

**Date:** February 18, 2026  
**Goal:** Force all users to sign up with name, email, and role before accessing search functionality, then complete onboarding.

---

## User Flow

```
┌─────────────┐
│   Home      │  User clicks "Get Started"
│   Page      │
└─────┬───────┘
      │
      ▼
┌─────────────┐
│   Sign Up   │  Collect: Name, Email, Password, Role
│   Page      │  - Name (required)
└─────┬───────┘  - Email (required)
      │          - Password (8+ chars, required)
      │          - Role: Policy/Brand/Academic/General (required)
      ▼
┌─────────────┐
│ Onboarding  │  Smart Topic Recommendations
│  (Topics)   │  - Pre-selects 8-14 topics based on role
└─────┬───────┘  - User can adjust selections
      │          - Geographic focus (National/State/City)
      │
      ▼
┌─────────────┐
│ Search or   │  User has full access
│ Dashboard   │  - Topics saved
└─────────────┘  - Personalized experience
```

---

## Implementation Details

### 1. ✅ Updated Sign Up Form

**File:** `app/signup/page.tsx`

**Changes:**
- Added **role** dropdown (required field)
- Made **name** required (was optional)
- Added validation for name and role
- Saves role to database via `/api/onboarding/use-case`
- Redirects to `/onboarding` (not `/search`)

**Role Options:**
```typescript
<option value="civic">Policy Researcher / Advocate</option>
<option value="brand">Marketer / Brand Manager</option>
<option value="policy">Academic / Policy Analyst</option>
<option value="general">General Interest</option>
```

**New Validation:**
```typescript
if (!name.trim()) {
  setError("Please enter your name");
  return;
}

if (!role) {
  setError("Please select your role");
  return;
}
```

---

### 2. ✅ Protected Routes with Middleware

**File:** `middleware.ts`

**Protected Routes:**
- `/search` - Now requires authentication + onboarding
- `/dashboard` - Requires authentication + onboarding
- `/research` - Requires authentication + onboarding
- `/onboarding` - Requires authentication only

**Auth Check:**
```typescript
if (!session) {
  // Redirect to /signup (not /login)
  const signupUrl = new URL("/signup", request.url);
  signupUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(signupUrl);
}
```

**Onboarding Completion Check:**
```typescript
const user = await prisma.user.findUnique({
  where: { supabaseUid: supabaseUser.id },
  select: { onboardingCompletedAt: true },
});

if (!user?.onboardingCompletedAt) {
  // Redirect to /onboarding
  const onboardingUrl = new URL("/onboarding", request.url);
  return NextResponse.redirect(onboardingUrl);
}
```

---

### 3. ✅ Updated Home Page CTAs

**File:** `app/page.tsx`

**Changed All CTAs:**
- ❌ "START SEARCH" → ✅ "GET STARTED"
- ❌ "TRY FREE" → ✅ "GET STARTED"
- ❌ `href="/search"` → ✅ `href="/signup"`
- ❌ "START 3-DAY FREE TRIAL" → ✅ "GET STARTED"

**Affected Sections:**
- Navigation header (2 buttons)
- Hero section (1 CTA)
- Live feed footer (1 link)
- Pricing tiers (3 CTAs)
- Final CTA section (1 button)

---

## Authentication Flow Matrix

| User State | Try to Access | Redirect To | Reason |
|-----------|---------------|-------------|--------|
| **Not Logged In** | Home (`/`) | Stay on home | Public route |
| Not Logged In | Search (`/search`) | `/signup` | Protected route |
| Not Logged In | Dashboard | `/signup` | Protected route |
| **Logged In, No Onboarding** | Home | Stay on home | Public route |
| Logged In, No Onboarding | Search | `/onboarding` | Need topics |
| Logged In, No Onboarding | Dashboard | `/onboarding` | Need topics |
| Logged In, No Onboarding | Onboarding | Stay on onboarding | Completing flow |
| **Logged In, Onboarding Done** | Any route | Access granted | Fully set up |

---

## Smart Topic Pre-Selection

**How It Works:**

1. User selects role during sign up
2. Role saved to database as `useCase`
3. Onboarding fetches `useCase` on mount
4. `getRecommendedTopics(useCase)` returns topic IDs
5. Topics pre-selected with ⭐ visual indicators

**Recommendations by Role:**

### Policy Researcher / Advocate (`civic`)
- 12 topics: Housing, Healthcare, Policing, Voting Rights, etc.
- Focus: Local government, civic engagement

### Marketer / Brand Manager (`brand`)
- 8 topics: Online Behavior, Consumer Protection, Digital Identity
- Focus: Consumer sentiment, brand reputation

### Academic / Policy Analyst (`policy`)
- 14 topics: Education, Environment, Democracy, Infrastructure
- Focus: Research-oriented, comprehensive

### General Interest (`general`)
- 8 topics: Balanced mix of high-impact topics
- Focus: Most common civic issues

---

## Database Schema

**No Changes Needed**  
Existing `User` model already has:

```prisma
model User {
  // ... other fields ...
  
  // Onboarding
  onboardingCompletedAt DateTime?  // null = not completed
  useCase               String?    // "civic", "brand", "policy", "general"
  
  // Topic Selection
  selectedTopics        Json?      // Array of topic IDs
  geoScope              String?    // "national", "state", "city"
  geoState              String?
  geoCity               String?
}
```

---

## Testing Checklist

### Sign Up Flow:

1. **Navigate to home page** (`/`)
   - ✅ See "GET STARTED" buttons
   - ✅ Click "GET STARTED"
   - ✅ Redirects to `/signup`

2. **Fill out sign up form:**
   - ✅ Enter name (required)
   - ✅ Enter email (required)
   - ✅ Enter password (8+ chars)
   - ✅ Select role (required)
   - ✅ Submit form

3. **Verify redirect:**
   - ✅ Should redirect to `/onboarding` (not `/search`)

### Onboarding Flow:

4. **Welcome screen:**
   - ✅ See welcome message
   - ✅ Click "Get Started"

5. **Topic selection:**
   - ✅ See 8-14 topics pre-selected with ⭐
   - ✅ Yellow highlight on recommended topics
   - ✅ Counter shows "X of Y recommended"
   - ✅ Can toggle topics on/off

6. **Geographic focus:**
   - ✅ Select National/State/City
   - ✅ Fill out state/city if needed

7. **Review:**
   - ✅ See all selections
   - ✅ Click "Go to Dashboard"
   - ✅ Saves successfully (no auth error!)

8. **Dashboard:**
   - ✅ See personalized topic cards
   - ✅ Can click topics to search

### Protected Routes:

9. **Try accessing `/search` without auth:**
   - ✅ Redirects to `/signup`

10. **Log out and try `/dashboard`:**
    - ✅ Redirects to `/signup`

11. **Log in but don't complete onboarding:**
    - ✅ Try `/search` → redirects to `/onboarding`
    - ✅ Try `/dashboard` → redirects to `/onboarding`

12. **Complete onboarding:**
    - ✅ Can access `/search` freely
    - ✅ Can access `/dashboard` freely

---

## Files Modified

### New Files (0):
None - reused existing infrastructure

### Modified Files (3):

1. **`app/signup/page.tsx`**
   - Added role dropdown
   - Made name required
   - Added validation
   - Save role to database
   - Redirect to `/onboarding`

2. **`middleware.ts`**
   - Protect `/search` route
   - Add onboarding completion check
   - Redirect to `/signup` (not `/login`)
   - Import Prisma for user lookup

3. **`app/page.tsx`**
   - Change all CTAs to `/signup`
   - Update button text

---

## Build Status

✅ **PASSED** - `npm run build`

```
Route (app)                              Size     First Load JS
├ ○ /search                              37.6 kB         207 kB
├ ○ /signup                              2.5 kB          153 kB
├ ○ /onboarding                          6.38 kB         103 kB

ƒ Middleware                             90.4 kB  (↑16 kB from Prisma)
```

**Note:** Middleware size increased from 74.3 kB to 90.4 kB due to adding Prisma client for onboarding check. This is acceptable for the added functionality.

---

## User Experience Impact

### Before:
- ❌ Users could access `/search` without account
- ❌ Sign up was optional
- ❌ No forced onboarding
- ❌ No personalization

### After:
- ✅ Forced sign up with name/email/role
- ✅ Forced onboarding after sign up
- ✅ Smart topic pre-selection based on role
- ✅ Personalized dashboard
- ✅ Protected search access

---

## Security Improvements

1. **Authentication Required:**
   - `/search` now protected
   - `/dashboard` now protected
   - `/research` now protected

2. **User Context:**
   - All users have name, email, role
   - All users complete onboarding
   - Better user tracking and analytics

3. **Data Quality:**
   - No anonymous usage
   - Complete user profiles
   - Clear user intent (via role)

---

## Analytics Opportunities

Now that all users have:
- ✅ Name
- ✅ Email  
- ✅ Role (use case)
- ✅ Selected topics
- ✅ Geographic focus

You can track:
- Conversion rate: Home → Sign Up → Onboarding → Active Use
- Topic selection patterns by role
- Which roles complete onboarding fastest
- Most popular topics by role
- Geographic distribution of users
- Feature usage by user segment

---

## Next Steps (Optional Enhancements)

1. **Social Sign Up:**
   - Add Google/LinkedIn OAuth
   - Pre-fill role based on LinkedIn profile

2. **Email Verification:**
   - Require email confirmation
   - Send verification link

3. **Progressive Onboarding:**
   - Allow skip with "Complete Later"
   - Periodic reminders to complete

4. **Role-Based Features:**
   - Show different UI based on role
   - Civic: Focus on policy impact
   - Brand: Focus on sentiment metrics
   - Policy: Focus on research tools

5. **Onboarding Analytics:**
   - Track drop-off rates
   - A/B test topic recommendations
   - Measure time to completion

---

## Troubleshooting

### Issue: "Failed to save preferences"
**Fixed in previous update** - Using Supabase auth now

### Issue: Users stuck in redirect loop
**Check:**
- Is `onboardingCompletedAt` set in database?
- Run: `SELECT id, email, "onboardingCompletedAt" FROM "User";`

### Issue: Middleware blocking legitimate routes
**Check matcher config:**
```typescript
matcher: [
  "/search",
  "/dashboard/:path*",
  "/research/:path*",
  "/onboarding",
]
```

### Issue: Slow middleware
**Prisma adds 16 KB** - consider caching user onboarding status in session/cookie for faster checks.

---

**Status:** ✅ Fully Implemented & Tested  
**Ready for:** Production Deploy

---

*Implemented by: Claude Sonnet 4.5 via Cursor*  
*Date: February 18, 2026*
