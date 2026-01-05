"use client";

import { useState, useRef, useEffect } from "react";

export interface FilterOption {
  id: string;
  label: string;
}

interface FilterDropdownProps {
  icon: React.ReactNode;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  testId?: string;
}

export default function FilterDropdown({
  icon,
  label,
  options,
  value,
  onChange,
  testId,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
          isOpen
            ? "border border-gray-400 bg-gray-100 text-gray-900"
            : "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
        }`}
        data-testid={testId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-gray-500">{icon}</span>
        <span>{selectedOption?.label || label}</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      <div
        className={`absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-150 ${
          isOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-1 opacity-0"
        }`}
        role="listbox"
        aria-label={label}
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              onChange(option.id);
              setIsOpen(false);
            }}
            className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors ${
              value === option.id
                ? "bg-gray-50 text-gray-900"
                : "text-gray-700 hover:bg-gray-50"
            }`}
            role="option"
            aria-selected={value === option.id}
            data-testid={`${testId}-option-${option.id}`}
          >
            <span>{option.label}</span>
            {value === option.id && (
              <svg
                className="h-4 w-4 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
