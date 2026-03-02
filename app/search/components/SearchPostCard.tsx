import type { Post } from "@/lib/types/api"
import VerificationBadge from "@/components/VerificationBadge"
import { PLATFORM_LABELS, PLATFORM_STYLES, SENTIMENT_STYLES } from "./platformConstants"

export default function SearchPostCard({ post }: { post: Post }) {
  const platformStyle = PLATFORM_STYLES[post.platform] ?? { color: "#505050", bg: "rgba(0,0,0,0.06)" }
  const sentiment = post.sentiment ?? "neutral"
  const sentimentStyle = SENTIMENT_STYLES[sentiment] ?? SENTIMENT_STYLES.neutral
  const platformLabel = PLATFORM_LABELS[post.platform] ?? post.platform
  const engagement = (post.engagement?.likes ?? 0) + (post.engagement?.comments ?? 0) + (post.engagement?.shares ?? 0) + (post.engagement?.views ?? 0)

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg p-3.5 transition-colors hover:border-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.04)]"
      style={{
        background: "rgba(0,0,0,0.025)",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 8,
        padding: "12px 14px",
      }}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: platformStyle.color, backgroundColor: platformStyle.bg }}>
            {platformLabel}
          </span>
          <span className="text-sm" style={{ color: "rgba(0,0,0,0.7)" }}>
            {post.author}
          </span>
          {post.verificationBadge && (
            <VerificationBadge badge={post.verificationBadge} size="sm" showLabel={false} />
          )}
          <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ color: sentimentStyle.color, backgroundColor: sentimentStyle.bg }}>
            {sentiment}
          </span>
        </div>
        <span className="text-[10px]" style={{ fontFamily: "var(--font-mono)", color: "rgba(0,0,0,0.4)" }}>
          {engagement.toLocaleString()} engagements
        </span>
      </div>
      <p className="mb-2 line-clamp-3 text-[13px] leading-relaxed" style={{ color: "rgba(0,0,0,0.75)", lineHeight: 1.5 }}>
        {post.text}
      </p>
    </a>
  )
}
