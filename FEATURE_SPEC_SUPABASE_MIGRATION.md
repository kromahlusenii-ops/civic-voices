# Feature Spec: Firebase to Supabase Migration

**Project:** Civic Voices  
**Date:** January 2025  
**Status:** Draft  
**Priority:** High

---

## Executive Summary

Migrate Civic Voices from Firebase (Auth + Firestore) to Supabase to consolidate authentication and data storage into a single PostgreSQL-based stack, simplifying architecture and reducing operational complexity.

**Key Benefits:**
- Unified authentication (eliminate dual Firebase + NextAuth system)
- Single database (PostgreSQL for all data, including search history)
- Reduced vendor lock-in and costs
- Better TypeScript/Prisma integration
- Simplified deployment and maintenance

---

## Current State Analysis

### Firebase Usage

#### 1. **Firebase Auth** (Client-side)
- **Location:** `lib/firebase.ts`, `app/contexts/AuthContext.tsx`, `app/components/AuthModal.tsx`
- **Features Used:**
  - Email/password authentication
  - Google OAuth (`signInWithPopup`)
  - Password reset (`sendPasswordResetEmail`)
  - Auth state management (`onAuthStateChanged`)
  - ID token generation (`getIdToken()`)

#### 2. **Firebase Admin SDK** (Server-side)
- **Location:** `lib/firebase-admin.ts`
- **Features Used:**
  - Token verification (`verifyFirebaseToken`)
  - Used in API routes: `/api/search/save`, `/api/search/history`

#### 3. **Firestore** (Search History Storage)
- **Location:** `lib/services/searchStorage.ts`
- **Collections:**
  - `searches` - Main search documents
  - `searchPosts` - Subcollection of posts per search
- **Features:**
  - In-memory caching (5-minute TTL)
  - Batch writes for atomic operations
  - Ownership verification

#### 4. **Firebase Analytics** (Optional)
- **Location:** `lib/firebase.ts`
- **Status:** Minimal usage, can be removed or replaced

### Dependencies

```json
{
  "firebase": "^12.7.0",
  "firebase-admin": "^13.6.0"
}
```

### Files Requiring Changes

**Client-side:**
- `lib/firebase.ts` → Replace with `lib/supabase.ts`
- `app/contexts/AuthContext.tsx` → Update to use Supabase
- `app/components/AuthModal.tsx` → Update auth methods
- `app/components/SearchHistorySidebar.tsx` → Update token retrieval
- `app/search/page.tsx` → Update token retrieval

**Server-side:**
- `lib/firebase-admin.ts` → Replace with `lib/supabase-server.ts`
- `lib/services/searchStorage.ts` → Migrate to PostgreSQL
- `app/api/search/save/route.ts` → Update token verification
- `app/api/search/history/route.ts` → Update token verification
- `app/api/auth/sync/route.ts` → Update or remove (no longer needed)

**Database:**
- `prisma/schema.prisma` → Add search history tables (already has Search model!)

**Config:**
- `lib/config.ts` → Add Supabase config
- `.env.local` → Add Supabase environment variables

---

## Migration Phases

### Phase 1: Setup & Preparation (Week 1)

#### 1.1 Supabase Project Setup
- [ ] Create Supabase project
- [ ] Configure Google OAuth provider in Supabase Dashboard
- [ ] Set up redirect URLs:
  - `http://localhost:3000/auth/callback` (development)
  - `https://yourdomain.com/auth/callback` (production)
- [ ] Get Supabase credentials:
  - Project URL
  - Anon key (publishable)
  - Service role key (server-side only)

#### 1.2 Environment Variables
Add to `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Keep Firebase vars during migration for rollback
# Remove after Phase 4 completion
```

#### 1.3 Database Schema Updates
- [ ] Review existing `Search` model in Prisma schema
- [ ] Add `SearchPost` model if needed (or use JSON field)
- [ ] Create migration for search history tables
- [ ] Run migration: `npx prisma migrate dev --name add_search_history`

#### 1.4 Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install --save-dev @supabase/auth-helpers-nextjs
```

### Phase 2: Parallel Implementation (Week 2)

#### 2.1 Create Supabase Client Libraries
- [ ] Create `lib/supabase.ts` (client-side)
- [ ] Create `lib/supabase-server.ts` (server-side)
- [ ] Create `lib/supabase-middleware.ts` (middleware helper)

#### 2.2 Migrate Search History to PostgreSQL
- [ ] Update `lib/services/searchStorage.ts` to use Prisma instead of Firestore
- [ ] Migrate existing Firestore data to PostgreSQL (one-time script)
- [ ] Update caching strategy (keep in-memory cache)
- [ ] Test search save/retrieve operations

#### 2.3 Update AuthContext
- [ ] Create new `AuthContext` using Supabase
- [ ] Keep old context as `AuthContext.firebase.ts` (backup)
- [ ] Update `app/providers.tsx` to use new context

#### 2.4 Update AuthModal
- [ ] Implement Supabase auth methods
- [ ] Keep Firebase methods commented for reference
- [ ] Test email/password and Google OAuth flows

### Phase 3: API Route Updates (Week 2-3)

#### 3.1 Update Token Verification
- [ ] Create `lib/auth/verify-supabase-token.ts`
- [ ] Update `/api/search/save/route.ts`
- [ ] Update `/api/search/history/route.ts`
- [ ] Remove `/api/auth/sync/route.ts` (no longer needed)

#### 3.2 Update Client Components
- [ ] Update `SearchHistorySidebar.tsx` to use Supabase tokens
- [ ] Update `SearchPage.tsx` to use Supabase tokens
- [ ] Update any other components using Firebase tokens

### Phase 4: Testing & Validation (Week 3)

#### 4.1 Unit Tests
- [ ] Update `AuthModal.test.tsx`
- [ ] Update `AuthContext` tests
- [ ] Update `searchStorage.test.ts`
- [ ] Update API route tests

#### 4.2 Integration Tests
- [ ] Test complete auth flow (signup, login, Google OAuth)
- [ ] Test search save/retrieve
- [ ] Test search history sidebar
- [ ] Test API authentication

#### 4.3 E2E Tests
- [ ] Update Playwright tests for new auth flow
- [ ] Test search history functionality
- [ ] Test authentication modals

#### 4.4 Data Migration Validation
- [ ] Verify all Firestore data migrated correctly
- [ ] Compare record counts
- [ ] Spot-check data integrity

### Phase 5: Deployment & Cleanup (Week 4)

#### 5.1 Production Deployment
- [ ] Deploy to staging environment
- [ ] Run data migration script
- [ ] Monitor for errors
- [ ] Deploy to production

#### 5.2 Cleanup
- [ ] Remove Firebase dependencies from `package.json`
- [ ] Delete `lib/firebase.ts` and `lib/firebase-admin.ts`
- [ ] Remove Firebase environment variables
- [ ] Update documentation
- [ ] Archive Firebase project (keep for 30 days for rollback)

---

## Technical Implementation Details

### 1. Supabase Client Setup

#### `lib/supabase.ts` (Client-side)
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
```

#### `lib/supabase-server.ts` (Server-side)
```typescript
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function createServerClient() {
  const cookieStore = cookies()
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false
      }
    }
  )
}

export async function verifySupabaseToken(token: string) {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return null
  }
  
  return user
}
```

### 2. AuthContext Migration

#### New `app/contexts/AuthContext.tsx`
```typescript
"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

### 3. AuthModal Migration

#### Key Changes in `app/components/AuthModal.tsx`

**Email/Password Signup:**
```typescript
// OLD (Firebase)
const userCredential = await createUserWithEmailAndPassword(auth, email, password)

// NEW (Supabase)
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      name: name || email.split('@')[0]
    }
  }
})
```

**Email/Password Login:**
```typescript
// OLD (Firebase)
const userCredential = await signInWithEmailAndPassword(auth, email, password)

// NEW (Supabase)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})
```

**Google OAuth:**
```typescript
// OLD (Firebase)
const result = await signInWithPopup(auth, googleProvider)

// NEW (Supabase)
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})
```

**Password Reset:**
```typescript
// OLD (Firebase)
await sendPasswordResetEmail(auth, email)

// NEW (Supabase)
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password`
})
```

**Remove sync endpoint call** - Supabase automatically syncs with database via triggers

### 4. Search Storage Migration

#### Update `lib/services/searchStorage.ts`

**Current (Firestore):**
```typescript
const db = getAdminFirestore()
const searchRef = db.collection(COLLECTIONS.SEARCHES).doc()
```

**New (PostgreSQL via Prisma):**
```typescript
import { prisma } from '@/lib/prisma'

export async function saveSearch(
  userId: string,
  data: { ... }
): Promise<{ searchId: string }> {
  // Use existing Search model from Prisma
  const search = await prisma.search.create({
    data: {
      userId,
      queryText: data.queryText,
      name: data.name || data.queryText,
      sources: data.sources,
      filtersJson: data.filters,
      totalResults: data.totalResults || 0,
      // Store posts as JSON in a field or create SearchPost model
    }
  })
  
  return { searchId: search.id }
}
```

**Note:** The Prisma schema already has a `Search` model! We may need to:
1. Add a `SearchPost` model, OR
2. Store posts as JSON in the `Search` model

### 5. API Route Updates

#### Update `/api/search/save/route.ts`
```typescript
// OLD
const decodedToken = await verifyFirebaseToken(idToken)
const firebaseUid = decodedToken.uid

// NEW
const user = await verifySupabaseToken(idToken)
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

// Use user.id (Supabase UUID) instead of firebaseUid
await saveSearch(user.id, { ... })
```

#### Update `/api/search/history/route.ts`
```typescript
// Similar token verification change
const user = await verifySupabaseToken(idToken)
const { searches } = await getSearchHistory(user.id, { ... })
```

### 6. Database Schema Updates

#### Option A: Use JSON Field (Simpler)
```prisma
model Search {
  id          String   @id @default(cuid())
  userId      String
  queryText   String
  name        String?
  sources     Source[]
  filtersJson Json
  postsJson   Json?    // Store posts as JSON array
  // ... rest of fields
}
```

#### Option B: Create SearchPost Model (Better for queries)
```prisma
model Search {
  id          String       @id @default(cuid())
  userId      String
  queryText   String
  name        String?
  sources     Source[]
  filtersJson Json
  posts       SearchPost[]
  // ... rest of fields
}

model SearchPost {
  id          String   @id @default(cuid())
  searchId    String
  search      Search   @relation(fields: [searchId], references: [id], onDelete: Cascade)
  postId      String
  text        String
  author      String
  platform    String
  url         String
  createdAt   DateTime
  engagement  Json
  rawData     Json?
  
  @@index([searchId])
  @@map("search_posts")
}
```

**Recommendation:** Use Option B for better queryability and data integrity.

### 7. Data Migration Script

Create `scripts/migrate-firestore-to-postgres.ts`:
```typescript
import { getAdminFirestore } from '@/lib/firebase-admin'
import { prisma } from '@/lib/prisma'

async function migrateSearchHistory() {
  const db = getAdminFirestore()
  const searchesSnapshot = await db.collection('searches').get()
  
  for (const searchDoc of searchesSnapshot.docs) {
    const searchData = searchDoc.data()
    
    // Get user by firebaseUid
    const user = await prisma.user.findUnique({
      where: { firebaseUid: searchData.userId }
    })
    
    if (!user) {
      console.warn(`User not found for search ${searchDoc.id}`)
      continue
    }
    
    // Get posts subcollection
    const postsSnapshot = await searchDoc.ref.collection('searchPosts').get()
    const posts = postsSnapshot.docs.map(doc => doc.data())
    
    // Create search in PostgreSQL
    await prisma.search.create({
      data: {
        userId: user.id,
        queryText: searchData.queryText,
        name: searchData.name,
        sources: searchData.sources,
        filtersJson: searchData.filters,
        totalResults: searchData.totalResults || 0,
        posts: {
          create: posts.map(post => ({
            postId: post.id,
            text: post.text,
            author: post.author,
            platform: post.platform,
            url: post.url,
            createdAt: new Date(post.createdAt),
            engagement: post.engagement,
            rawData: post.rawData
          }))
        }
      }
    })
  }
}
```

---

## Testing Strategy

### Unit Tests

#### AuthContext Test
```typescript
// app/contexts/AuthContext.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase')

describe('AuthContext', () => {
  it('should provide user state', async () => {
    const mockUser = { id: '123', email: 'test@example.com' }
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null
    })
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })
    
    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })
  })
})
```

#### SearchStorage Test
```typescript
// lib/services/searchStorage.test.ts
import { saveSearch, getSearchHistory } from './searchStorage'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma')

describe('searchStorage', () => {
  it('should save search to PostgreSQL', async () => {
    const mockSearch = { id: '123', userId: 'user1', ... }
    vi.mocked(prisma.search.create).mockResolvedValue(mockSearch)
    
    const result = await saveSearch('user1', {
      queryText: 'test query',
      sources: ['x', 'tiktok'],
      filters: { timeFilter: '7d' }
    })
    
    expect(result.searchId).toBe('123')
    expect(prisma.search.create).toHaveBeenCalled()
  })
})
```

### Integration Tests

1. **Complete Auth Flow:**
   - Sign up with email/password
   - Sign in with email/password
   - Sign in with Google OAuth
   - Password reset flow
   - Sign out

2. **Search History Flow:**
   - Save search after authentication
   - Retrieve search history
   - Delete search
   - Rename search

3. **API Authentication:**
   - Verify protected routes require valid token
   - Verify token extraction from headers
   - Verify user ID mapping

### E2E Tests (Playwright)

Update existing tests:
- `e2e/dashboard.spec.ts` - Update auth flow
- `e2e/landing.spec.ts` - Verify auth modal works

---

## Rollback Plan

### If Migration Fails

1. **Immediate Rollback:**
   - Revert code changes (git revert)
   - Keep Firebase environment variables
   - Firebase data remains intact (read-only during migration)

2. **Data Recovery:**
   - Firestore data is not deleted during migration
   - Can continue using Firebase if needed

3. **Gradual Rollback:**
   - Keep Supabase code but switch feature flag
   - Route traffic back to Firebase
   - Monitor for issues

### Rollback Checklist

- [ ] Revert `package.json` dependencies
- [ ] Restore `lib/firebase.ts` and `lib/firebase-admin.ts`
- [ ] Restore `app/contexts/AuthContext.tsx` (Firebase version)
- [ ] Restore `app/components/AuthModal.tsx` (Firebase version)
- [ ] Restore `lib/services/searchStorage.ts` (Firestore version)
- [ ] Update environment variables
- [ ] Deploy rollback
- [ ] Verify Firebase functionality

---

## Environment Variables

### New Variables (Add to `.env.local`)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Variables to Remove (After Phase 5)
```env
# Firebase (remove after migration complete)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
```

### Update `lib/config.ts`
```typescript
interface Config {
  // ... existing config
  
  supabase: {
    url: string
    anonKey: string
    serviceRoleKey: string
  }
}

function loadConfig(): Config {
  return {
    // ... existing config
    
    supabase: {
      url: getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      anonKey: getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      serviceRoleKey: getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    },
  }
}
```

---

## Timeline & Milestones

### Week 1: Setup
- **Day 1-2:** Supabase project setup, environment config
- **Day 3-4:** Database schema updates, Prisma migration
- **Day 5:** Install dependencies, create base Supabase clients

### Week 2: Core Migration
- **Day 1-2:** Migrate search storage to PostgreSQL
- **Day 3-4:** Update AuthContext and AuthModal
- **Day 5:** Update API routes

### Week 3: Testing & Refinement
- **Day 1-2:** Unit and integration tests
- **Day 3-4:** E2E tests, bug fixes
- **Day 5:** Data migration script and validation

### Week 4: Deployment
- **Day 1-2:** Staging deployment and testing
- **Day 3:** Production deployment
- **Day 4-5:** Monitoring, cleanup, documentation

**Total Estimated Time:** 4 weeks

---

## Success Criteria

### Functional Requirements
- [ ] All authentication flows work (email/password, Google OAuth)
- [ ] Search history saves and retrieves correctly
- [ ] All API routes authenticate properly
- [ ] No data loss during migration
- [ ] All existing features work as before

### Performance Requirements
- [ ] Auth operations complete in < 2 seconds
- [ ] Search history loads in < 1 second
- [ ] API response times unchanged

### Quality Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] No console errors in production
- [ ] Code coverage maintained

---

## Risks & Mitigation

### Risk 1: Data Loss During Migration
**Mitigation:**
- Run migration script in staging first
- Keep Firestore data intact (read-only)
- Validate data integrity after migration
- Have rollback plan ready

### Risk 2: Authentication Downtime
**Mitigation:**
- Implement parallel auth systems during transition
- Use feature flags to switch between systems
- Monitor error rates closely

### Risk 3: Breaking Changes in Supabase API
**Mitigation:**
- Pin Supabase package versions
- Test thoroughly in staging
- Monitor Supabase changelog

### Risk 4: User Session Interruption
**Mitigation:**
- Communicate migration to users
- Implement session migration if possible
- Provide clear error messages

---

## Dependencies & Prerequisites

### External Dependencies
- Supabase project created and configured
- Google OAuth credentials (reuse existing)
- PostgreSQL database (already have via Prisma)

### Internal Dependencies
- Prisma schema updated
- Environment variables configured
- All team members aware of migration

### Prerequisites
- Backup of Firestore data
- Staging environment available
- Monitoring tools in place

---

## Documentation Updates

### Code Documentation
- [ ] Update `openmemory.md` with Supabase architecture
- [ ] Add inline code comments for new Supabase code
- [ ] Update API documentation

### User Documentation
- [ ] Update README.md with new setup instructions
- [ ] Update environment variable documentation
- [ ] Add migration notes for developers

### Runbook
- [ ] Document Supabase admin procedures
- [ ] Document troubleshooting steps
- [ ] Document rollback procedures

---

## Post-Migration Tasks

### Immediate (Week 4)
- [ ] Monitor error rates and performance
- [ ] Verify all features working
- [ ] Collect user feedback

### Short-term (Month 1)
- [ ] Remove Firebase dependencies
- [ ] Archive Firebase project
- [ ] Update all documentation
- [ ] Team training on Supabase

### Long-term (Month 2+)
- [ ] Optimize database queries
- [ ] Implement Supabase real-time features if needed
- [ ] Consider Supabase Edge Functions for serverless needs

---

## Notes

- **Supabase Publishable Key:** `sb_publishable_f2DivdT0HgikByBvcJX4_g_Yz7Ipfq4`
  - ⚠️ **Security Note:** This is a publishable key (safe for client-side)
  - Store in `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Never commit service role key to repository

- **Migration Strategy:** Gradual migration with parallel systems during transition

- **Data Migration:** One-time script to move Firestore → PostgreSQL

- **Testing:** Comprehensive test coverage before production deployment

---

## Approval

**Prepared by:** AI Assistant  
**Reviewed by:** [Pending]  
**Approved by:** [Pending]  
**Date:** [Pending]

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-01-XX | 1.0 | Initial spec draft | AI Assistant |
