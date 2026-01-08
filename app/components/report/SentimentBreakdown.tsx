"use client";

interface SentimentBreakdownProps {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export default function SentimentBreakdown({
  positive,
  neutral,
  negative,
  total,
}: SentimentBreakdownProps) {
  const getPercentage = (value: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const sentiments = [
    {
      label: "Positive",
      value: positive,
      percentage: getPercentage(positive),
      color: "bg-green-500",
      icon: "😊",
    },
    {
      label: "Neutral",
      value: neutral,
      percentage: getPercentage(neutral),
      color: "bg-gray-400",
      icon: "😐",
    },
    {
      label: "Negative",
      value: negative,
      percentage: getPercentage(negative),
      color: "bg-red-500",
      icon: "😠",
    },
  ];

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4"
      data-testid="sentiment-breakdown"
    >
      <h3 className="text-sm font-medium text-gray-700 mb-4">
        Sentiment Breakdown
      </h3>

      {/* Stacked bar */}
      <div className="h-4 rounded-full overflow-hidden flex mb-4">
        {sentiments.map((sentiment, index) => (
          <div
            key={index}
            className={`${sentiment.color} transition-all duration-300`}
            style={{ width: `${sentiment.percentage}%` }}
            title={`${sentiment.label}: ${sentiment.percentage}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {sentiments.map((sentiment, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{sentiment.icon}</span>
              <span className="text-sm text-gray-700">{sentiment.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                {sentiment.value}
              </span>
              <span className="text-xs text-gray-500">
                ({sentiment.percentage}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
