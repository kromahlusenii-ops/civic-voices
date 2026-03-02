# Signup Flow Fix - Account Created but Stuck on Login

## Problem

User accounts were being created successfully, but users were redirected to the login page instead of proceeding to onboarding.

## Root Cause

**Email confirmation** is likely enabled in your Supabase project, which means:
1. ✅ `supabase.auth.signUp()` creates the account successfully
2. ❌ But no session is returned until email is confirmed
3. ❌ Subsequent `signInWithPassword()` fails because email isn't confirmed yet
4. ❌ User gets stuck on signup/login screen

## Solution 1: Disable Email Confirmation (Recommended for MVP/Testing)

### Steps to Disable Email Confirmation:

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard

2. **Navigate to Authentication Settings**
   - Select your project
   - Go to **Authentication** → **Providers**
   - Click on **Email**

3. **Disable "Confirm email"**
   - Toggle **"Confirm email"** to **OFF**
   - Click **Save**

4. **Test the flow**
   - Try signing up with a new email
   - Should automatically log in and redirect to onboarding! ✅

### Why This Works:
When email confirmation is disabled, `signUp()` immediately returns a valid session, allowing the user to proceed directly to onboarding.

## Solution 2: Update Signup Flow Logic (Already Implemented)

I've updated `app/signup/page.tsx` to handle the email confirmation scenario better:

### What Changed:

**Before:**
```typescript
// ❌ Old behavior
if (signInError || !signInData?.session) {
  setError("Account created! Please check your email...");
  setTimeout(() => {
    router.push("/login"); // Automatic redirect after 3 seconds
  }, 3000);
}
```

**After:**
```typescript
// ✅ New behavior
if (signInError) {
  console.error("Sign in error after signup:", signInError);
  setError("Account created! If you're not redirected, please check your email to confirm your account.");
  setLoading(false);
  // No automatic redirect - user stays on signup page with error message
  return;
}

if (signInData?.session) {
  // Successfully signed in, proceed to onboarding
  router.push("/onboarding");
  return;
}

// No error but also no session - try to proceed anyway
// Middleware will handle authentication if needed
router.push("/onboarding");
```

### What This Fixes:
- **Removes automatic redirect** to `/login` after account creation
- **Better error messaging** when email confirmation is required
- **Attempts to proceed** to onboarding even without explicit session (middleware will protect if needed)
- **Clearer console logging** for debugging

## Testing the Fix

### Test Case 1: Email Confirmation Disabled (Ideal Flow)
```
1. Go to /signup
2. Enter name, email, password
3. Click "Sign up"
4. ✅ Should immediately redirect to /onboarding
5. ✅ Start role selection flow
```

### Test Case 2: Email Confirmation Enabled
```
1. Go to /signup
2. Enter name, email, password
3. Click "Sign up"
4. ⚠️ See message: "Account created! If you're not redirected, please check your email..."
5. Check email inbox for confirmation link
6. Click confirmation link
7. Then click "Sign in" link on signup page
8. Log in with credentials
9. ✅ Should redirect to /onboarding
```

## Recommended Action

**For Development/Testing:**
- ✅ **Disable email confirmation** in Supabase (Solution 1)
- This provides the best user experience during development
- You can always re-enable it for production

**For Production:**
- Consider keeping email confirmation enabled for security
- But update onboarding flow to handle unconfirmed users gracefully
- Or implement a "verify email" reminder in the app

## Current Status

✅ **Code Updated** - Signup flow now handles both scenarios
🔧 **Configuration Needed** - Disable email confirmation in Supabase for smooth flow
📝 **Testing Required** - Verify the flow works with a fresh signup

---

**Last Updated:** February 17, 2026  
**File Modified:** `app/signup/page.tsx`  
**Status:** Ready for Testing
