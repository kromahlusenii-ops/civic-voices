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
      <div
        className="grid grid-cols-3 gap-3"
        data-testid="metrics-row"
      >
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center mb-2">
              <p className="text-xs text-gray-500 font-medium">
                {metric.label}
              </p>
              <InfoButton
                explanation={getExplanation(metric.explanationKey)}
                onOpenModal={setModalExplanation}
              />
            </div>
            <p className="text-2xl font-bold tracking-tight text-gray-900">
              {metric.value}
            </p>
          </div>
        ))}
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
