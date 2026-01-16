import { prisma } from "@/lib/prisma";
import { Source, Prisma } from "@prisma/client";

// Types for search data
export interface SearchPost {
  id: string;
  text: string;
  author: string;
  authorHandle?: string;
  authorAvatar?: string;
  platform: string;
  url: string;
  thumbnail?: string;
  createdAt?: string;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  queryText: string;
  sources: string[];
  filters: {
    timeFilter: string;
    language?: string;
  };
  totalResults: number;
  posts?: SearchPost[];
  reportId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchFilters {
  timeFilter: string;
  language?: string;
}

// In-memory cache for search history
interface CacheEntry {
  data: SavedSearch[];
  timestamp: number;
}

const searchHistoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Clear stale cache entries periodically
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of searchHistoryCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      searchHistoryCache.delete(key);
    }
  }
}

/**
 * Map string source to Prisma Source enum
 */
function mapToSourceEnum(source: string): Source | null {
  const normalized = source.toUpperCase();
  switch (normalized) {
    case "X":
      return Source.X;
    case "TIKTOK":
      return Source.TIKTOK;
    case "REDDIT":
      return Source.REDDIT;
    case "INSTAGRAM":
      return Source.INSTAGRAM;
    case "YOUTUBE":
      return Source.YOUTUBE;
    case "LINKEDIN":
      return Source.LINKEDIN;
    default:
      return null;
  }
}

/**
 * Get or create a user by Supabase UID
 * Checks both supabaseUid and firebaseUid fields for compatibility
 */
async function getOrCreateUserBySupabaseUid(supabaseUid: string): Promise<string> {
  // First try supabaseUid field
  let user = await prisma.user.findUnique({
    where: { supabaseUid },
    select: { id: true },
  });

  if (user) {
    return user.id;
  }

  // Fall back to firebaseUid field (legacy)
  user = await prisma.user.findUnique({
    where: { firebaseUid: supabaseUid },
    select: { id: true },
  });

  if (user) {
    return user.id;
  }

  // Create new user with both fields set for compatibility
  user = await prisma.user.create({
    data: {
      supabaseUid,
      firebaseUid: supabaseUid,
      email: `${supabaseUid}@placeholder.local`,
    },
    select: { id: true },
  });

  return user.id;
}

/**
 * Save a search to PostgreSQL
 */
export async function saveSearch(
  supabaseUid: string,
  data: {
    queryText: string;
    name?: string;
    sources: string[];
    filters: SearchFilters;
    totalResults?: number;
    posts?: SearchPost[];
  }
): Promise<{ searchId: string }> {
  // Get or create user by Supabase UID
  const userId = await getOrCreateUserBySupabaseUid(supabaseUid);

  // Map sources to enum
  const validSources = data.sources
    .map(mapToSourceEnum)
    .filter((s): s is Source => s !== null);

  // Create search with posts in a transaction
  const search = await prisma.search.create({
    data: {
      userId,
      queryText: data.queryText,
      name: data.name || data.queryText,
      sources: validSources,
      filtersJson: data.filters as unknown as Prisma.InputJsonValue,
      totalResults: data.totalResults || data.posts?.length || 0,
      posts: data.posts && data.posts.length > 0
        ? {
            create: data.posts.map((post) => ({
              postId: post.id,
              text: post.text,
              author: post.author,
              authorHandle: post.authorHandle || post.author,
              authorAvatar: post.authorAvatar,
              platform: post.platform.toUpperCase(),
              url: post.url,
              thumbnail: post.thumbnail,
              engagement: (post.engagement || { likes: 0, comments: 0, shares: 0 }) as Prisma.InputJsonValue,
              createdAt: post.createdAt ? new Date(post.createdAt) : new Date(),
            })),
          }
        : undefined,
    },
    select: { id: true },
  });

  // Invalidate user's cache
  invalidateUserCache(supabaseUid);

  return { searchId: search.id };
}

/**
 * Get search history for a user with caching
 */
export async function getSearchHistory(
  supabaseUid: string,
  options: {
    query?: string;
    limit?: number;
    useCache?: boolean;
  } = {}
): Promise<{ searches: SavedSearch[]; total: number; fromCache: boolean }> {
  const { query, limit = 50, useCache = true } = options;
  const cacheKey = `${supabaseUid}:${query || "all"}:${limit}`;

  // Check cache first
  if (useCache) {
    const cached = searchHistoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        searches: cached.data,
        total: cached.data.length,
        fromCache: true,
      };
    }
  }

  // Find user by Supabase UID (check both fields for compatibility)
  let user = await prisma.user.findUnique({
    where: { supabaseUid },
    select: { id: true },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { firebaseUid: supabaseUid },
      select: { id: true },
    });
  }

  if (!user) {
    return { searches: [], total: 0, fromCache: false };
  }

  // Build query conditions
  const whereClause: {
    userId: string;
    OR?: Array<{ name: { contains: string; mode: "insensitive" } } | { queryText: { contains: string; mode: "insensitive" } }>;
  } = {
    userId: user.id,
  };

  // Add text search if query provided
  if (query) {
    whereClause.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { queryText: { contains: query, mode: "insensitive" } },
    ];
  }

  const dbSearches = await prisma.search.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      userId: true,
      name: true,
      queryText: true,
      sources: true,
      filtersJson: true,
      totalResults: true,
      reportId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const searches: SavedSearch[] = dbSearches.map((search) => ({
    id: search.id,
    userId: supabaseUid, // Return the supabaseUid for API compatibility
    name: search.name || search.queryText,
    queryText: search.queryText,
    sources: search.sources as string[],
    filters: search.filtersJson as { timeFilter: string; language?: string },
    totalResults: search.totalResults,
    reportId: search.reportId,
    createdAt: search.createdAt.toISOString(),
    updatedAt: search.updatedAt.toISOString(),
  }));

  // Update cache
  searchHistoryCache.set(cacheKey, {
    data: searches,
    timestamp: Date.now(),
  });

  // Periodic cleanup
  cleanupCache();

  return {
    searches,
    total: searches.length,
    fromCache: false,
  };
}

/**
 * Get a single search by ID
 */
export async function getSearchById(
  searchId: string,
  supabaseUid: string
): Promise<SavedSearch | null> {
  // Find user by Supabase UID (check both fields for compatibility)
  let user = await prisma.user.findUnique({
    where: { supabaseUid },
    select: { id: true },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { firebaseUid: supabaseUid },
      select: { id: true },
    });
  }

  if (!user) {
    return null;
  }

  const search = await prisma.search.findFirst({
    where: {
      id: searchId,
      userId: user.id,
    },
    select: {
      id: true,
      userId: true,
      name: true,
      queryText: true,
      sources: true,
      filtersJson: true,
      totalResults: true,
      reportId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!search) {
    return null;
  }

  return {
    id: search.id,
    userId: supabaseUid,
    name: search.name || search.queryText,
    queryText: search.queryText,
    sources: search.sources as string[],
    filters: search.filtersJson as { timeFilter: string; language?: string },
    totalResults: search.totalResults,
    reportId: search.reportId,
    createdAt: search.createdAt.toISOString(),
    updatedAt: search.updatedAt.toISOString(),
  };
}

/**
 * Get posts for a search
 */
export async function getSearchPosts(
  searchId: string,
  supabaseUid: string
): Promise<SearchPost[]> {
  // Verify ownership first
  const search = await getSearchById(searchId, supabaseUid);
  if (!search) {
    return [];
  }

  const posts = await prisma.searchPost.findMany({
    where: { searchId },
    orderBy: { createdAt: "desc" },
  });

  return posts.map((post) => ({
    id: post.postId,
    text: post.text,
    author: post.author,
    authorHandle: post.authorHandle,
    authorAvatar: post.authorAvatar || undefined,
    platform: post.platform,
    url: post.url,
    thumbnail: post.thumbnail || undefined,
    createdAt: post.createdAt.toISOString(),
    engagement: post.engagement as {
      likes: number;
      comments: number;
      shares: number;
      views?: number;
    },
  }));
}

/**
 * Delete a search
 */
export async function deleteSearch(
  searchId: string,
  supabaseUid: string
): Promise<boolean> {
  // Find user by Supabase UID (check both fields for compatibility)
  let user = await prisma.user.findUnique({
    where: { supabaseUid },
    select: { id: true },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { firebaseUid: supabaseUid },
      select: { id: true },
    });
  }

  if (!user) {
    return false;
  }

  // Verify ownership and delete
  const search = await prisma.search.findFirst({
    where: {
      id: searchId,
      userId: user.id,
    },
  });

  if (!search) {
    return false;
  }

  // Delete search (posts will cascade delete due to schema)
  await prisma.search.delete({
    where: { id: searchId },
  });

  // Invalidate cache
  invalidateUserCache(supabaseUid);

  return true;
}

/**
 * Rename a search
 */
export async function renameSearch(
  searchId: string,
  supabaseUid: string,
  newName: string
): Promise<boolean> {
  // Find user by Supabase UID (check both fields for compatibility)
  let user = await prisma.user.findUnique({
    where: { supabaseUid },
    select: { id: true },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { firebaseUid: supabaseUid },
      select: { id: true },
    });
  }

  if (!user) {
    return false;
  }

  // Verify ownership
  const search = await prisma.search.findFirst({
    where: {
      id: searchId,
      userId: user.id,
    },
  });

  if (!search) {
    return false;
  }

  // Update the name
  await prisma.search.update({
    where: { id: searchId },
    data: { name: newName },
  });

  // Invalidate cache
  invalidateUserCache(supabaseUid);

  return true;
}

/**
 * Invalidate cache for a user
 */
export function invalidateUserCache(supabaseUid: string): void {
  for (const key of searchHistoryCache.keys()) {
    if (key.startsWith(`${supabaseUid}:`)) {
      searchHistoryCache.delete(key);
    }
  }
}

/**
 * Clear entire cache (useful for testing)
 */
export function clearCache(): void {
  searchHistoryCache.clear();
}
