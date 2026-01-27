"use client";

import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

interface Post {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  authorAvatar?: string;
  platform: string;
  url: string;
  thumbnail?: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
  sentiment?: "positive" | "negative" | "neutral" | null;
  createdAt: string | Date;
}

interface TopPostsProps {
  posts: Post[];
  limit?: number;
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
  instagram: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0z" />
    </svg>
  ),
  youtube: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
};

const SENTIMENT_CONFIG = {
  positive: {
    label: "Positive",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
  },
  neutral: {
    label: "Neutral",
    bgColor: "bg-gray-50",
    textColor: "text-gray-600",
    borderColor: "border-gray-200",
  },
  negative: {
    label: "Negative",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    borderColor: "border-red-200",
  },
};

function formatEngagement(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

function getTotalEngagement(engagement: Post["engagement"]): number {
  return (
    (engagement.likes || 0) +
    (engagement.comments || 0) +
    (engagement.shares || 0)
  );
}

export default function TopPosts({ posts, limit = 5 }: TopPostsProps) {
  if (!posts || posts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          Top Performing Posts
        </h3>
        <p className="text-sm text-gray-500">No posts available</p>
      </div>
    );
  }

  // Sort by total engagement and take top N
  const topPosts = [...posts]
    .sort((a, b) => getTotalEngagement(b.engagement) - getTotalEngagement(a.engagement))
    .slice(0, limit);

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 overflow-hidden"
      data-testid="top-posts"
    >
      <h3 className="text-sm font-medium text-gray-700 mb-4">
        Top Performing Posts
      </h3>

      {/* Mobile: horizontal scroll carousel, Desktop: vertical list */}
      <div className="relative -mx-4 sm:mx-0 w-full min-w-0">
        <div className="flex gap-3 overflow-x-auto px-4 sm:px-0 pb-2 sm:pb-0 snap-x scrollbar-hide
                        sm:flex-col sm:overflow-visible sm:snap-none sm:space-y-4 sm:gap-0 w-full min-w-0">
          {topPosts.map((post) => {
            const sentimentConfig = post.sentiment
              ? SENTIMENT_CONFIG[post.sentiment]
              : null;

            return (
              <div
                key={post.id}
                className="flex-shrink-0 w-[280px] sm:w-auto snap-start
                           border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
              {/* Header: Avatar, author info, platform icon, sentiment badge */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* Author Avatar */}
                  {post.authorAvatar ? (
                    <Image
                      src={post.authorAvatar}
                      alt={post.author}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      unoptimized
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-500 text-xs font-medium">
                        {post.author.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {post.author}
                      </span>
                      <span className="text-gray-500 flex-shrink-0">
                        {PLATFORM_ICONS[post.platform] || null}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 truncate">
                      @{post.authorHandle}
                    </span>
                  </div>
                </div>
                {sentimentConfig && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${sentimentConfig.bgColor} ${sentimentConfig.textColor} border ${sentimentConfig.borderColor}`}
                  >
                    {sentimentConfig.label}
                  </span>
                )}
              </div>

              {/* Post text - truncated */}
              <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                {post.text}
              </p>

              {/* Footer: Engagement metrics and timestamp */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    {formatEngagement(post.engagement.likes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    {formatEngagement(post.engagement.comments)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                    {formatEngagement(post.engagement.shares)}
                  </span>
                </div>
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1"
                >
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                  })}
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          );
        })}
        </div>
        {/* Fade indicator on mobile */}
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white pointer-events-none sm:hidden" />
      </div>
    </div>
  );
}
