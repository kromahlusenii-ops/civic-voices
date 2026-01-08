"use client";

interface SkeletonCardProps {
  className?: string;
}

export default function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}
      data-testid="skeleton-card"
    >
      <div className="flex gap-3">
        {/* Generic platform icon placeholder */}
        <div className="flex-shrink-0">
          <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          {/* Username and timestamp */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
          </div>

          {/* Post content lines */}
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          </div>

          {/* Engagement metrics placeholder */}
          <div className="flex gap-4 pt-1">
            <div className="h-3 w-12 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-12 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonCardList({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4" data-testid="skeleton-card-list">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}
