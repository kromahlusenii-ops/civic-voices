# Supabase OAuth – Redirect to Localhost (Not Production)

## What you’re seeing

When you sign up or log in with **Google** on **localhost**, you get sent to the **production** `/login` page after Google finishes.

## Why it can happen

1. **Redirect URLs** – Supabase only redirects to URLs in its allowlist. If localhost isn’t there, it may use **Site URL** (often prod).
2. **Site URL** – In some flows Supabase falls back to **Site URL** (e.g. `https://civicvoices.ai`), so you can end up on prod even with localhost in Redirect URLs.
3. **Redirect base** – The app now prefers `NEXT_PUBLIC_APP_URL` for the OAuth redirect base when set, so local dev can force `http://localhost:3000` and avoid prod.

## Fix 1: Set app URL locally (recommended)

In your **local** `.env`:

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

The app uses this for the OAuth `redirectTo` when present, so Supabase always gets `http://localhost:3000/auth/callback` when you run locally. Restart the dev server after changing `.env`.

## Fix 2: Supabase redirect URLs and Site URL

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** and select your project.
2. Go to **Authentication** → **URL Configuration**.
3. Under **Redirect URLs**, ensure you have:
   - `http://localhost:3000/auth/callback`
   - `https://civicvoices.ai/auth/callback` (prod)
4. **Site URL** – If redirects still go to prod, try setting **Site URL** to `http://localhost:3000` while testing locally, then set it back to `https://civicvoices.ai` for production. (Some flows fall back to Site URL.)
5. Click **Save**.

## After this

Sign up / log in with Google on `http://localhost:3000` should land you back on localhost (e.g. `/onboarding` or `/search`) instead of production `/login`.

## Reference

- OAuth `redirectTo` uses `NEXT_PUBLIC_APP_URL` when set, else `window.location.origin`, in:
  - `app/signup/page.tsx`
  - `app/login/page.tsx`
  - `app/components/AuthModal.tsx`
- Callback handler: `app/auth/callback/route.ts` (uses request origin for redirects).
