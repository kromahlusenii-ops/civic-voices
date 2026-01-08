# Phase 1 Setup Guide - Supabase Migration

This guide walks you through completing Phase 1 of the Firebase to Supabase migration.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- Supabase account (create at https://supabase.com)

## Step 1: Install Dependencies

Run the following command to install Supabase packages:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Note:** If you encounter npm cache permission issues, run:
```bash
sudo chown -R $(whoami) ~/.npm
```

Then retry the install command.

## Step 2: Set Up Supabase Project

1. **Create a Supabase project:**
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Fill in project details
   - Wait for project to be created (takes ~2 minutes)

2. **Get your Supabase credentials:**
   - Go to Project Settings → API
   - Copy the following:
     - **Project URL** (e.g., `https://xxxxx.supabase.co`)
     - **anon/public key** (starts with `eyJ...`)
     - **service_role key** (starts with `eyJ...`) - ⚠️ Keep this secret!

3. **Configure Google OAuth (if using):**
   - Go to Authentication → Providers
   - Enable Google provider
   - Add your Google OAuth credentials (same ones used with Firebase)
   - Set redirect URL: `http://localhost:3000/auth/callback` (development)
   - Set redirect URL: `https://yourdomain.com/auth/callback` (production)

## Step 3: Update Environment Variables

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Add your Supabase credentials to `.env.local`:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   ```

   **Important:** 
   - Use the publishable key you provided: `sb_publishable_f2DivdT0HgikByBvcJX4_g_Yz7Ipfq4` for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Get your project URL and service role key from Supabase dashboard
   - Never commit `.env.local` to git

## Step 4: Run Database Migration

The Prisma schema has been updated with:
- `supabaseUid` field on User model
- `SearchPost` model for storing search history posts
- `totalResults` field on Search model

Run the migration:

```bash
npx prisma generate
npx prisma migrate dev --name add_supabase_support
```

This will:
- Generate Prisma client with new models
- Create migration files
- Apply migration to your database

## Step 5: Verify Setup

1. **Check that Supabase clients are created:**
   - `lib/supabase.ts` - Client-side Supabase client
   - `lib/supabase-server.ts` - Server-side Supabase client

2. **Verify config is updated:**
   - `lib/config.ts` should include Supabase configuration

3. **Test the setup:**
   ```bash
   npm run dev
   ```

   The app should start without errors. If you see Supabase configuration errors, check your `.env.local` file.

## Step 6: Next Steps

Once Phase 1 is complete, you're ready for Phase 2:

- ✅ Supabase clients created
- ✅ Database schema updated
- ✅ Configuration updated
- ✅ OAuth callback route created

**Phase 2 will include:**
- Migrating search storage from Firestore to PostgreSQL
- Updating AuthContext to use Supabase
- Updating AuthModal to use Supabase auth methods

## Troubleshooting

### Error: "Missing Supabase configuration"
- Check that all three Supabase environment variables are set in `.env.local`
- Restart your dev server after adding env vars

### Error: "Cannot find module '@supabase/supabase-js'"
- Run `npm install @supabase/supabase-js @supabase/ssr`
- Check that packages are in `package.json`

### Database migration errors
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env.local` is correct
- Try `npx prisma migrate reset` (⚠️ This will delete all data)

### OAuth redirect errors
- Verify redirect URLs in Supabase dashboard match your app URLs
- Check that `/app/auth/callback/route.ts` exists

## Files Created/Modified in Phase 1

### New Files
- `lib/supabase.ts` - Client-side Supabase client
- `lib/supabase-server.ts` - Server-side Supabase client and token verification
- `app/auth/callback/route.ts` - OAuth callback handler
- `.env.example` - Environment variables template
- `PHASE1_SETUP_GUIDE.md` - This guide

### Modified Files
- `prisma/schema.prisma` - Added `supabaseUid` and `SearchPost` model
- `lib/config.ts` - Added Supabase configuration

### Next Phase
- `package.json` - Will need Supabase dependencies installed

## Checklist

- [ ] Supabase project created
- [ ] Google OAuth configured in Supabase (if using)
- [ ] Environment variables added to `.env.local`
- [ ] Supabase packages installed (`npm install`)
- [ ] Database migration run (`npx prisma migrate dev`)
- [ ] Dev server starts without errors
- [ ] Ready for Phase 2

---

**Questions?** Refer to `FEATURE_SPEC_SUPABASE_MIGRATION.md` for detailed migration plan.
