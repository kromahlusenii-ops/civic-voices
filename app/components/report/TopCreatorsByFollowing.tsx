"use client";

import { useState } from "react";
import Image from "next/image";
import type { Post } from "@/lib/types/api";

// Info icon component
function InfoIcon({ tooltip }: { tooltip: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block z-30">
      <button
        className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="More information"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path strokeWidth="2" d="M12 16v-4m0-4h.01" />
        </svg>
      </button>
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg whitespace-normal max-w-[200px] sm:max-w-xs">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

interface TopCreatorsByFollowingProps {
  posts: Post[];
  limit?: number;
}

interface CreatorData {
  author: string;
  authorHandle: string;
  authorAvatar?: string;
  platform: string;
  followersCount: number;
  postCount: number;
  totalEngagement: number;
  isVerified: boolean;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  x: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  tiktok: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  ),
  reddit: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249z" />
    </svg>
  ),
  youtube: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  bluesky: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" />
    </svg>
  ),
  truthsocial: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  ),
  instagram: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0z" />
    </svg>
  ),
  linkedin: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
};

const PLATFORM_COLORS: Record<string, string> = {
  x: "bg-black text-white",
  tiktok: "bg-black text-white",
  reddit: "bg-orange-500 text-white",
  youtube: "bg-red-600 text-white",
  bluesky: "bg-blue-500 text-white",
  truthsocial: "bg-purple-600 text-white",
  instagram: "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white",
  linkedin: "bg-blue-700 text-white",
};

function formatFollowers(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}

function getProfileUrl(platform: string, handle: string): string {
  const cleanHandle = handle.replace(/^@/, "").replace(/^u\//, "");
  switch (platform) {
    case "x":
      return `https://x.com/${cleanHandle}`;
    case "tiktok":
      return `https://tiktok.com/@${cleanHandle}`;
    case "reddit":
      return `https://reddit.com/user/${cleanHandle}`;
    case "youtube":
      return `https://youtube.com/@${cleanHandle}`;
    case "bluesky":
      return `https://bsky.app/profile/${cleanHandle}`;
    case "truthsocial":
      return `https://truthsocial.com/@${cleanHandle}`;
    case "instagram":
      return `https://instagram.com/${cleanHandle}`;
    case "linkedin":
      return `https://linkedin.com/in/${cleanHandle}`;
    default:
      return "#";
  }
}

function aggregateCreators(posts: Post[]): CreatorData[] {
  const creatorMap = new Map<string, CreatorData>();

  for (const post of posts) {
    const key = `${post.authorHandle}-${post.platform}`;
    const followersCount = post.authorMetadata?.followersCount || 0;
    const totalEngagement =
      (post.engagement.likes || 0) +
      (post.engagement.comments || 0) +
      (post.engagement.shares || 0);

    const existing = creatorMap.get(key);

    if (existing) {
      existing.postCount += 1;
      existing.totalEngagement += totalEngagement;
      // Update followers count if higher
      if (followersCount > existing.followersCount) {
        existing.followersCount = followersCount;
      }
      // Update avatar if we find one
      if (!existing.authorAvatar && post.authorAvatar) {
        existing.authorAvatar = post.authorAvatar;
      }
    } else {
      creatorMap.set(key, {
        author: post.author,
        authorHandle: post.authorHandle,
        authorAvatar: post.authorAvatar,
        platform: post.platform,
        followersCount,
        postCount: 1,
        totalEngagement,
        isVerified: post.authorMetadata?.isVerified || post.authorMetadata?.isPlatformOfficial || false,
      });
    }
  }

  return Array.from(creatorMap.values());
}

// Creator card component
function CreatorCard({ creator, showFollowers }: { creator: CreatorData; showFollowers: boolean }) {
  return (
    <a
      href={getProfileUrl(creator.platform, creator.authorHandle)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-[160px] sm:w-[180px] snap-start
                 border border-gray-100 rounded-lg p-3 hover:bg-gray-50 hover:border-gray-200 transition-colors cursor-pointer"
    >
      {/* Avatar + Platform badge */}
      <div className="relative mb-3">
        {creator.authorAvatar ? (
          <Image
            src={creator.authorAvatar}
            alt={creator.author}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover mx-auto"
            unoptimized
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center mx-auto">
            <span className="text-gray-500 text-lg font-medium">
              {creator.author.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {/* Platform badge */}
        <span
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 p-1 rounded-full ${
            PLATFORM_COLORS[creator.platform] || "bg-gray-500 text-white"
          }`}
        >
          {PLATFORM_ICONS[creator.platform]}
        </span>
      </div>

      {/* Name + Handle + Verification */}
      <div className="text-center mb-2">
        <div className="flex items-center justify-center gap-1">
          <p className="text-sm font-medium text-gray-800 truncate">{creator.author}</p>
          {/* Verification checkmark */}
          {creator.isVerified && (
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" />
            </svg>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{creator.authorHandle}</p>
      </div>

      {/* Follower Count or Engagement - Prominent */}
      <div className="flex items-center justify-center gap-1 mb-2">
        {showFollowers && creator.followersCount > 0 ? (
          <>
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-sm font-semibold text-gray-800">
              {formatFollowers(creator.followersCount)}
            </span>
            <span className="text-xs text-gray-400">followers</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span className="text-sm font-semibold text-gray-800">
              {formatFollowers(creator.totalEngagement)}
            </span>
            <span className="text-xs text-gray-400">engagements</span>
          </>
        )}
      </div>

      {/* Secondary Stats */}
      <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1" title="Posts in this report">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
          {creator.postCount} {creator.postCount === 1 ? "post" : "posts"}
        </span>
      </div>
    </a>
  );
}

// Section component for Top Voices or Top Creators
function CreatorSection({
  title,
  subtitle,
  tooltip,
  creators,
  onViewAll,
  testId,
  showFollowers,
}: {
  title: string;
  subtitle: string;
  tooltip: string;
  creators: CreatorData[];
  onViewAll?: () => void;
  testId: string;
  showFollowers: boolean;
}) {
  if (creators.length === 0) return null;

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 overflow-visible"
      data-testid={testId}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          <span className="text-xs text-gray-400">{subtitle}</span>
          <InfoIcon tooltip={tooltip} />
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
          >
            View all
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Horizontal scroll row */}
      <div className="relative -mx-4 sm:mx-0">
        <div className="flex gap-3 overflow-x-auto px-4 sm:px-0 pb-2 snap-x scrollbar-hide">
          {creators.map((creator, index) => (
            <CreatorCard
              key={`${creator.authorHandle}-${creator.platform}-${index}`}
              creator={creator}
              showFollowers={showFollowers}
            />
          ))}
        </div>
        {/* Fade indicator */}
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white pointer-events-none sm:hidden" />
      </div>
    </div>
  );
}

export default function TopCreatorsByFollowing({ posts, limit = 6 }: TopCreatorsByFollowingProps) {
  const allCreators = aggregateCreators(posts);

  // Separate creators with follower data from those without
  const creatorsWithFollowers = allCreators
    .filter(c => c.followersCount > 0)
    .sort((a, b) => b.followersCount - a.followersCount);

  const creatorsWithoutFollowers = allCreators
    .filter(c => c.followersCount === 0)
    .sort((a, b) => b.totalEngagement - a.totalEngagement);

  // Prefer creators with follower data; only fall back to engagement if none have followers
  const hasFollowerData = creatorsWithFollowers.length > 0;
  const topVoices = hasFollowerData
    ? creatorsWithFollowers.slice(0, limit)
    : creatorsWithoutFollowers.slice(0, limit);

  // Don't render if no creators at all
  if (topVoices.length === 0) {
    return null;
  }

  return (
    <CreatorSection
      title="Top Voices"
      subtitle={hasFollowerData ? "By follower count" : "By engagement"}
      tooltip={hasFollowerData
        ? "Creators ranked by follower count across all platforms."
        : "Creators ranked by engagement (follower data not available)."}
      creators={topVoices}
      testId="top-voices"
      showFollowers={true}
    />
  );
}
