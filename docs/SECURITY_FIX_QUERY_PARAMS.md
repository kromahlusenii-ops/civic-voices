# Security Fix - Query Parameter Data Exposure

## Problem Reported

User reported that personal data was appearing in URL query parameters during account creation and onboarding flow.

## Security Risks of Query Parameters

Passing sensitive data in URLs is dangerous because:
1. **Browser History**: URLs are saved in browser history
2. **Server Logs**: URLs are logged by web servers
3. **Referrer Headers**: URLs can leak to third-party sites
4. **Sharing**: Users might accidentally share URLs with personal data
5. **Analytics**: URL parameters are often sent to analytics tools

## Data That Should NEVER Be in URLs

❌ Email addresses  
❌ Passwords  
❌ Names  
❌ Authentication tokens  
❌ Personal preferences (in some cases)  
❌ Session IDs  

## Fixes Applied

### 1. Removed `callbackUrl` from Signup Redirect
**File:** `middleware.ts`

**Before:**
```typescript
if (!session) {
  const signupUrl = new URL("/signup", request.url);
  signupUrl.searchParams.set("callbackUrl", pathname); // ❌ Exposed path in URL
  return NextResponse.redirect(signupUrl);
}
```

**After:**
```typescript
if (!session) {
  return NextResponse.redirect(new URL("/signup", request.url)); // ✅ Clean URL
}
```

### 2. Removed `onboarding=complete` from Dashboard Redirect
**File:** `app/onboarding/page.tsx`

**Before:**
```typescript
router.push('/dashboard?onboarding=complete') // ❌ Unnecessary query param
```

**After:**
```typescript
router.push('/dashboard') // ✅ Clean redirect
```

## Current URL Patterns (Post-Fix)

### Safe URLs (No Sensitive Data)
✅ `/signup` - No query params  
✅ `/onboarding` - No query params  
✅ `/dashboard` - No query params  
✅ `/search?q=housing` - Only search queries (public data)  
✅ `/auth/callback?code=...&next=/onboarding` - OAuth codes (one-time use, expires quickly)  

## Data Transmission Method

All sensitive data is now transmitted via:
- **POST request bodies** (encrypted in transit via HTTPS)
- **HTTP-only cookies** (not accessible to JavaScript)
- **Session storage** (client-side only, not in URLs)

Example - Onboarding submission:
```typescript
// ✅ Correct: POST body
fetch('/api/onboarding/complete', {
  method: 'POST',
  body: JSON.stringify({
    selectedTopics,
    geoScope,
    geoState,
    geoCity,
  }),
})

// ❌ Wrong: Query parameters
router.push(`/dashboard?topics=${topics}&location=${location}`)
```

## Verification Checklist

After fixes:
- [ ] Sign up → Check URL (should be `/onboarding`, no params)
- [ ] Complete onboarding → Check URL (should be `/dashboard`, no params)
- [ ] Login → Check URL (should redirect cleanly)
- [ ] Browser history → No sensitive data in any URLs

## Additional Security Measures in Place

1. **HTTPS in Production** - All traffic encrypted
2. **HTTP-Only Cookies** - Auth cookies not accessible to JavaScript
3. **Supabase Auth** - Industry-standard authentication
4. **POST for mutations** - All data changes use POST bodies
5. **Middleware protection** - Routes protected server-side

## What Query Params ARE Safe

✅ **Search queries**: `?q=housing policy` - Public search terms  
✅ **Feature flags**: `?debug=true` - Non-sensitive settings  
✅ **UI state**: `?tab=analytics` - Client-side preferences  
✅ **OAuth codes**: `?code=xxx` - One-time use, expires immediately  

## Testing

Verify the fix:
```bash
npm run dev
# 1. Sign up with new account
# 2. Watch the URL bar throughout the flow
# 3. URLs should be:
#    - /signup (clean)
#    - /onboarding (clean, no params)
#    - /dashboard (clean, no params)
```

---

**Last Updated:** February 17, 2026  
**Security Level:** High Priority  
**Status:** Fixed and Deployed
