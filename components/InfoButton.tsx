"use client";

import { useState, useRef, useEffect } from "react";

export interface ValueExplanation {
  label: string;
  shortDescription: string;
  fullDescription: string;
  calculation?: string;
  limitations?: string[];
  learnMoreLink?: string;
}

interface InfoButtonProps {
  explanation: ValueExplanation;
  size?: "sm" | "md";
  onOpenModal?: (explanation: ValueExplanation) => void;
}

export default function InfoButton({
  explanation,
  size = "sm",
  onOpenModal,
}: InfoButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<"top" | "bottom">("top");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Adjust tooltip position if it would go off screen
  useEffect(() => {
    if (showTooltip && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const spaceAbove = buttonRect.top;
      const tooltipHeight = 80; // Approximate height

      if (spaceAbove < tooltipHeight + 10) {
        setTooltipPosition("bottom");
      } else {
        setTooltipPosition("top");
      }
    }
  }, [showTooltip]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenModal) {
      onOpenModal(explanation);
    }
  };

  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full transition-colors"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={handleClick}
        aria-label={`More information about ${explanation.label}`}
        aria-describedby={showTooltip ? "tooltip" : undefined}
      >
        <svg
          className={sizeClasses[size]}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path strokeWidth="2" d="M12 16v-4m0-4h.01" />
        </svg>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          ref={tooltipRef}
          id="tooltip"
          role="tooltip"
          className={`absolute z-50 left-1/2 -translate-x-1/2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg max-w-xs ${
            tooltipPosition === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <p className="font-medium mb-0.5">{explanation.label}</p>
          <p className="text-gray-300">{explanation.shortDescription}</p>
          {onOpenModal && (
            <p className="text-blue-300 mt-1 text-[10px]">Click for more details</p>
          )}
          {/* Arrow */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
              tooltipPosition === "top"
                ? "top-full border-t-gray-900"
                : "bottom-full border-b-gray-900"
            }`}
          />
        </div>
      )}
    </div>
  );
}
