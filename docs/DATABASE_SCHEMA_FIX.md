# Database Schema Fix: Onboarding Columns

## Issue

Onboarding preferences were failing to save with the error:
```
The column `selectedTopics` does not exist in the current database.
```

## Root Cause

The Prisma schema had the onboarding columns defined (lines 30-34 in `schema.prisma`), but they had never been pushed to the actual PostgreSQL database.

Additionally, there was a persistent TLS/SSL certificate issue preventing `prisma db push` from connecting to Supabase:
```
Error: P1011: Error opening a TLS connection: bad certificate format
```

## Solution Applied

### 1. Updated Database Connection (`.env`)

Changed the `DIRECT_URL` from the pooler to the actual database endpoint:

**Before:**
```
DIRECT_URL="postgresql://postgres.dunaqdazwbexlmwrhahy:C%40r9igan4veNCd@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
```

**After:**
```
DIRECT_URL="postgresql://postgres:C%40r9igan4veNCd@db.dunaqdazwbexlmwrhahy.supabase.co:5432/postgres?sslaccept=strict"
```

### 2. Manual SQL Migration

Since Prisma migration tools continued to fail due to SSL issues, ran SQL directly via psql:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS "selectedTopics" JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "geoScope" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "geoState" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "geoCity" TEXT;
```

### 3. Regenerated Prisma Client

```bash
npx prisma generate
```

## Columns Added

| Column | Type | Description |
|--------|------|-------------|
| `selectedTopics` | JSONB | Array of selected subcategory IDs from taxonomy (e.g., `["affordable-housing", "healthcare-access"]`) |
| `geoScope` | TEXT | Geographic scope: "national", "state", or "city" |
| `geoState` | TEXT | State code (e.g., "NC") if geoScope is "state" or "city" |
| `geoCity` | TEXT | City name (e.g., "Charlotte") if geoScope is "city" |

## Verification

After applying these changes:
1. ✅ Database columns exist
2. ✅ Prisma client regenerated
3. ✅ Dev server restarted
4. ✅ `/api/onboarding/complete` endpoint can now save preferences

## Testing

To test the fix:
1. Navigate to `http://localhost:3002` (or current dev server port)
2. Sign up or log in
3. Complete onboarding flow (role → topics → geographic scope → review)
4. Click "Launch Dashboard"
5. Verify no "Failed to save preferences" error appears

## Future Prevention

When adding new database columns:
1. Update `prisma/schema.prisma`
2. Run `npx prisma db push` (or manual SQL if SSL issues persist)
3. Run `npx prisma generate`
4. Restart dev server

---

**Fixed:** 2026-02-18  
**Issue:** Database schema out of sync  
**Impact:** Onboarding completion was failing for all users
