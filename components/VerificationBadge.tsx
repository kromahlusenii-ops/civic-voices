/**
 * VerificationBadge Component
 *
 * Displays credibility badges for verified sources based on their tier:
 * - Official: Government, institutions (blue)
 * - News: Major news outlets (purple)
 * - Journalist: Credentialed reporters (indigo)
 * - Expert: Academics, researchers (teal)
 * - Verified: Platform verified (gray)
 * - Sourced: Cross-referenced claim (green)
 * - Context: Disputed claim (amber)
 */

import { VerificationBadge as BadgeType } from '@/lib/types/api';

interface VerificationBadgeProps {
  badge: BadgeType;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const BADGE_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  official: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: '🏛️',
  },
  news: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    icon: '📰',
  },
  journalist: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    icon: '✍️',
  },
  expert: {
    bg: 'bg-teal-100',
    text: 'text-teal-700',
    icon: '🎓',
  },
  verified: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    icon: '✓',
  },
  sourced: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: '✓',
  },
  context: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: '⚠️',
  },
};

export default function VerificationBadge({ badge, size = 'sm', showLabel = true }: VerificationBadgeProps) {
  const style = BADGE_STYLES[badge.type] || BADGE_STYLES.verified;

  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-xs gap-1'
    : 'px-2 py-1 text-sm gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${style.bg} ${style.text} ${sizeClasses}`}
      title={badge.description}
    >
      <span className="flex-shrink-0">{style.icon}</span>
      {showLabel && <span>{badge.label}</span>}
    </span>
  );
}

/**
 * Compact badge for inline display (icon only with tooltip)
 */
export function VerificationBadgeCompact({ badge }: { badge: BadgeType }) {
  const style = BADGE_STYLES[badge.type] || BADGE_STYLES.verified;

  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${style.bg} ${style.text}`}
      title={`${badge.label}: ${badge.description}`}
    >
      {style.icon}
    </span>
  );
}

/**
 * Credibility score indicator with color coding
 */
export function CredibilityIndicator({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 0.8) return 'bg-green-500';
    if (s >= 0.6) return 'bg-blue-500';
    if (s >= 0.4) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 0.8) return 'High';
    if (s >= 0.6) return 'Medium';
    if (s >= 0.4) return 'Low';
    return 'Unknown';
  };

  return (
    <div className="flex items-center gap-1.5" title={`Credibility: ${Math.round(score * 100)}%`}>
      <div className="h-2 w-12 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${getScoreColor(score)}`}
          style={{ width: `${score * 100}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{getScoreLabel(score)}</span>
    </div>
  );
}
