"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Source {
  id: string;
  name: string;
  enabled: boolean;
  icon: string;
}

const SOURCES: Source[] = [
  { id: "x", name: "X", enabled: true, icon: "✖️" },
  { id: "tiktok", name: "TikTok", enabled: true, icon: "🎵" },
  { id: "reddit", name: "Reddit", enabled: false, icon: "🔴" },
  { id: "youtube", name: "YouTube", enabled: false, icon: "▶️" },
  { id: "instagram", name: "Instagram", enabled: false, icon: "📷" },
  { id: "linkedin", name: "LinkedIn", enabled: false, icon: "💼" },
];

interface SourceFilterProps {
  selectedSources: string[];
  onSourcesChange: (sources: string[]) => void;
  updateUrlParams?: boolean;
  className?: string;
}

export default function SourceFilter({
  selectedSources,
  onSourcesChange,
  updateUrlParams = false,
  className = "",
}: SourceFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Update URL params when sources change (only on results view)
  useEffect(() => {
    if (updateUrlParams && selectedSources.length > 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sources", selectedSources.join(","));
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [selectedSources, updateUrlParams, searchParams, router]);

  const toggleSource = (sourceId: string) => {
    const source = SOURCES.find((s) => s.id === sourceId);
    if (!source?.enabled) return;

    if (selectedSources.includes(sourceId)) {
      onSourcesChange(selectedSources.filter((id) => id !== sourceId));
    } else {
      onSourcesChange([...selectedSources, sourceId]);
    }
  };

  const getPrimarySource = () => {
    const primaryId = selectedSources[0];
    return SOURCES.find((s) => s.id === primaryId);
  };

  const getButtonLabel = () => {
    if (selectedSources.length === 0) return "Select sources";

    const primary = getPrimarySource();
    if (selectedSources.length === 1) {
      return primary?.name || "Source";
    }

    return `${primary?.name || "Source"} +${selectedSources.length - 1}`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2"
        data-testid="source-filter-button"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-base">{getPrimarySource()?.icon}</span>
        <span>{getButtonLabel()}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 top-full z-10 mt-2 w-56 animate-dropdown-open rounded-md bg-white py-2 shadow-lg ring-1 ring-black ring-opacity-5"
          data-testid="source-filter-dropdown"
          role="menu"
          aria-orientation="vertical"
        >
          {SOURCES.map((source) => {
            const isSelected = selectedSources.includes(source.id);
            const isDisabled = !source.enabled;

            return (
              <button
                key={source.id}
                onClick={() => toggleSource(source.id)}
                disabled={isDisabled}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                  isDisabled
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-gray-50"
                }`}
                data-testid={`source-option-${source.id}`}
                role="menuitemcheckbox"
                aria-checked={isSelected}
                title={isDisabled ? "Coming soon" : ""}
              >
                {/* Custom Checkbox */}
                <div
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition ${
                    isSelected
                      ? "border-accent-blue bg-accent-blue"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="h-3 w-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>

                {/* Source Icon & Name */}
                <span className="text-base">{source.icon}</span>
                <span className="flex-1">{source.name}</span>

                {/* Coming Soon Badge */}
                {isDisabled && (
                  <span className="text-xs text-gray-400">Coming soon</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
