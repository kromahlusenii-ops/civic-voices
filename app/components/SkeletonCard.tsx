"use client"

interface SkeletonCardProps {
  className?: string
}

export default function SkeletonCard({ className = "" }: SkeletonCardProps) {
  const pulseStyle = { backgroundColor: "rgba(0,0,0,0.06)" }
  const pulseSubtleStyle = { backgroundColor: "rgba(0,0,0,0.04)" }

  return (
    <div
      className={`rounded-lg p-4 ${className}`}
      style={{ backgroundColor: "rgba(0,0,0,0.025)", border: "1px solid rgba(0,0,0,0.06)" }}
      data-testid="skeleton-card"
    >
      <div className="flex gap-3">
        {/* Generic platform icon placeholder */}
        <div className="flex-shrink-0">
          <div className="h-5 w-5 animate-pulse rounded" style={pulseStyle} />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          {/* Username and timestamp */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 animate-pulse rounded" style={pulseStyle} />
            <div className="h-3 w-16 animate-pulse rounded" style={pulseSubtleStyle} />
          </div>

          {/* Post content lines */}
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded" style={pulseStyle} />
            <div className="h-4 w-11/12 animate-pulse rounded" style={pulseStyle} />
            <div className="h-4 w-3/4 animate-pulse rounded" style={pulseSubtleStyle} />
          </div>

          {/* Engagement metrics placeholder */}
          <div className="flex gap-4 pt-1">
            <div className="h-3 w-12 animate-pulse rounded" style={pulseSubtleStyle} />
            <div className="h-3 w-12 animate-pulse rounded" style={pulseSubtleStyle} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonCardList({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4" data-testid="skeleton-card-list">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}
