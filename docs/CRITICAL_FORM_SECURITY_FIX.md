# 🚨 CRITICAL: Form GET Submission Security Fix

## Issue

**SEVERITY: CRITICAL** - Passwords and sensitive user data were being exposed in URL query parameters.

Example of the security vulnerability:
```
http://localhost:3000/signup?name=Lusenii+Kromah&email=kromah.lusenii%40gmail.com&password=Seniik94%21
```

## Root Cause

HTML forms with named inputs (`name` attribute) but without an explicit `method="POST"` were submitting via GET method in some browser contexts, causing all form data including passwords to appear in the URL.

## Impact

- **Passwords visible in plain text** in the URL bar
- **Browser history stores passwords** 
- **Server logs capture passwords**
- **Anyone viewing the screen** can see credentials
- **Referrer headers** may leak credentials to third parties

## Fix Applied

### 1. Added explicit form attributes

**Before:**
```tsx
<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
```

**After:**
```tsx
<form className="mt-8 space-y-6" onSubmit={handleSubmit} method="POST" action="javascript:void(0)">
```

### 2. Removed `name` attributes from inputs

Since we're using React controlled components (`value` and `onChange`), the `name` attributes were unnecessary and potentially dangerous.

**Before:**
```tsx
<input
  id="email"
  name="email"  // ❌ This caused GET submission
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

**After:**
```tsx
<input
  id="email"
  type="email"  // ✅ No name attribute
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

## Files Modified

1. `/app/signup/page.tsx` - Signup form
   - Added `method="POST" action="javascript:void(0)"` to form
   - Removed `name` attributes from: name, email, password inputs

2. `/app/login/page.tsx` - Login form
   - Added `method="POST" action="javascript:void(0)"` to form
   - Removed `name` attributes from: email, password inputs

## Why This Works

1. **`method="POST"`**: Explicitly tells the browser to use POST, not GET
2. **`action="javascript:void(0)"`**: Prevents any default form submission since we handle it with JavaScript
3. **No `name` attributes**: Without names, browsers can't construct query parameters even if GET is triggered
4. **React controlled components**: We already manage state with `useState`, so `name` attributes were redundant

## Verification

After this fix, form submissions:
- ✅ Do NOT add query parameters to the URL
- ✅ Passwords stay in JavaScript memory only
- ✅ No sensitive data in browser history
- ✅ No credentials in server logs (unless explicitly logged from request body)

## Prevention

For any new forms with sensitive data:

1. **Always** use `method="POST"` explicitly
2. **Never** use `name` attributes on sensitive inputs in React controlled forms
3. **Always** call `e.preventDefault()` in submit handlers
4. **Consider** using `action="javascript:void(0)"` as a safety net

## Related Security Fixes

See also:
- `docs/SECURITY_FIX_QUERY_PARAMS.md` - Removed data exposure in middleware redirects
- `docs/SIGNUP_FLOW_FIX.md` - Cookie propagation and session management

---

**Fixed:** 2026-02-15  
**Reported by:** User (kromah.lusenii@gmail.com)  
**Severity:** Critical (CWE-598: Use of GET Request Method With Sensitive Query Strings)
