"use client";

import { useState } from "react";
import InfoButton, { type ValueExplanation } from "@/components/InfoButton";
import InfoModal from "@/components/InfoModal";
import { getExplanation } from "@/lib/valueExplanations";

interface MetricsRowProps {
  totalMentions?: number;
  totalEngagement: number;
  avgEngagement?: number;
  overallSentiment?: "positive" | "neutral" | "negative" | "mixed";
  totalViews?: number;
  potentialReach?: number;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toLocaleString();
}

export default function MetricsRow({
  totalEngagement,
  totalViews,
  potentialReach,
}: MetricsRowProps) {
  const [modalExplanation, setModalExplanation] = useState<ValueExplanation | null>(null);

  // Estimate views if not provided (based on engagement patterns)
  const estimatedViews = totalViews ?? totalEngagement * 15;

  // Estimate potential reach if not provided
  const estimatedReach = potentialReach ?? Math.round(estimatedViews * 2.5);

  const metrics = [
    {
      label: "Est. engagements",
      value: formatNumber(totalEngagement),
      explanationKey: "totalEngagement",
    },
    {
      label: "Est. views",
      value: formatNumber(estimatedViews),
      explanationKey: "totalViews",
    },
    {
      label: "Potential reach",
      value: formatNumber(estimatedReach),
      explanationKey: "potentialReach",
    },
  ];

  return (
    <>
      {/* Mobile: horizontal scroll, Desktop: grid */}
      <div className="relative -mx-4 sm:mx-0">
        <div
          className="flex gap-3 overflow-x-auto px-4 sm:px-0 pb-2 sm:pb-0 snap-x scrollbar-hide
                     sm:grid sm:grid-cols-3 sm:overflow-visible sm:snap-none"
          data-testid="metrics-row"
        >
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[140px] sm:w-auto snap-start
                         bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-2">
                <p className="text-xs text-gray-500 font-medium whitespace-nowrap">
                  {metric.label}
                </p>
                <InfoButton
                  explanation={getExplanation(metric.explanationKey)}
                  onOpenModal={setModalExplanation}
                />
              </div>
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
        {/* Fade indicator on mobile */}
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-gray-50 pointer-events-none sm:hidden" />
      </div>

      {/* Info Modal */}
      <InfoModal
        isOpen={modalExplanation !== null}
        explanation={modalExplanation}
        onClose={() => setModalExplanation(null)}
      />
    </>
  );
}
