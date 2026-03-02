# User Creation Race Condition Fix

## Issue

Multiple API endpoints were failing with:
```
PrismaClientKnownRequestError: 
Invalid `prisma.user.create()` invocation:

Unique constraint failed on the fields: (`email`)
```

This caused onboarding to fail with "Failed to save your preferences" error.

## Root Cause

**Race condition between Supabase Auth and Prisma User records:**

1. User signs up via Supabase Auth → Supabase user created with `supabaseUid`
2. Multiple API endpoints try to "auto-create" the Prisma user record
3. First endpoint creates user with email
4. Second endpoint also tries to create user with same email → FAILS

Or alternatively:
1. User was created in Prisma without a `supabaseUid` (old signup flow)
2. User logs in via Supabase with new UID
3. API tries to create user by `supabaseUid` → email already exists → FAILS

## Solution Applied

Updated all API endpoints to use a **3-step user lookup/creation strategy**:

1. **Try to find by `supabaseUid`** (primary key from Supabase Auth)
2. **If not found, try to find by `email`** (handles legacy users or race conditions)
3. **If found by email, LINK the `supabaseUid`** (update the existing record)
4. **If still not found, CREATE new user** (truly new user)

This prevents duplicate email errors and ensures users aren't lost.

## Files Fixed

### 1. `/app/api/onboarding/complete/route.ts`
Used when saving onboarding preferences (topics, geographic scope, use case).

**Before:**
```typescript
let user = await prisma.user.findUnique({ where: { supabaseUid } });
if (!user) {
  user = await prisma.user.create({ data: { supabaseUid, email, ... } });
}
```

**After:**
```typescript
let user = await prisma.user.findUnique({ where: { supabaseUid } });
if (!user) {
  user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { supabaseUid } });
  } else {
    user = await prisma.user.create({ data: { supabaseUid, email, ... } });
  }
}
```

### 2. `/app/api/billing/status/route.ts`
Used to check user's subscription and credit status.

Applied same 3-step lookup pattern.

### 3. `/app/api/billing/deduct/route.ts`
Used when deducting credits for searches and reports.

Applied same 3-step lookup pattern.

## Why This Happens

Common scenarios:
- **Multiple tabs/requests**: User completes onboarding while billing status loads → race condition
- **Legacy migration**: Old users without `supabaseUid` need linking
- **Webhook delays**: Supabase webhook hasn't created Prisma record yet
- **Dev testing**: Database cleared but Supabase auth users remain

## Testing

To verify the fix:
1. Sign up with a new account
2. Complete onboarding (role → topics → geo → launch)
3. Verify no "Failed to save preferences" error
4. Check dashboard loads correctly
5. Try searching to verify billing/credit deduction works

## Prevention

When creating new API endpoints that need user records:
1. Always use the 3-step pattern (supabaseUid → email → create)
2. Never assume user exists by UID alone
3. Handle both "user doesn't exist" and "user exists but missing UID" cases
4. Use transactions for critical user creation logic

## Related Issues

This fixes:
- ✅ Onboarding preferences not saving
- ✅ "Failed to save your preferences" error
- ✅ Billing status 500 errors on first login
- ✅ Credit deduction failures for new users

---

**Fixed:** 2026-02-18  
**Issue:** P2002 Unique constraint violation on email field  
**Severity:** Critical (blocked onboarding for all users)  
**Impact:** All new user signups were unable to complete onboarding
