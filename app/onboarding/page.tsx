"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SUGGESTED_TOPICS = [
  { query: "immigration", label: "Immigration" },
  { query: "AI regulation", label: "AI" },
  { query: "climate policy", label: "Climate" },
  { query: "cryptocurrency", label: "Crypto" },
  { query: "2026 elections", label: "2026 Elections" },
  { query: "tech layoffs", label: "Tech Layoffs" },
  { query: "healthcare policy", label: "Healthcare" },
  { query: "housing crisis", label: "Housing" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleTopic = (query: string) => {
    setSelectedTopics((prev) =>
      prev.includes(query)
        ? prev.filter((t) => t !== query)
        : [...prev, query]
    );
  };

  const addCustomTopic = () => {
    const trimmed = customTopic.trim();
    if (trimmed && !selectedTopics.includes(trimmed)) {
      setSelectedTopics((prev) => [...prev, trimmed]);
      setCustomTopic("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomTopic();
    }
  };

  const completeOnboarding = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: selectedTopics }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete onboarding");
      }

      // Navigate to search page
      router.push("/search");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipOnboarding = async () => {
    setIsSubmitting(true);
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: [], skipped: true }),
      });
      router.push("/search");
    } catch (err) {
      console.error(err);
      router.push("/search");
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress Indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                s === step
                  ? "bg-signal-coral"
                  : s < step
                  ? "bg-signal-coral/50"
                  : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center animate-fade-in">
            <h1 className="font-display text-3xl md:text-4xl text-ink mb-4">
              Welcome to Civic Voices
            </h1>
            <p className="text-ink-light text-lg mb-8 max-w-md mx-auto">
              Track conversations across YouTube, TikTok, and Bluesky.
              See what people are really saying.
            </p>
            <button
              onClick={() => setStep(2)}
              className="bg-signal-coral text-white px-8 py-3 rounded-full font-medium hover:bg-signal-coral/90 transition-colors"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step 2: Pick Topics */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="font-display text-2xl md:text-3xl text-ink text-center mb-2">
              What do you want to track?
            </h2>
            <p className="text-ink-light text-center mb-6">
              Pick a few topics to get started
            </p>

            {/* Suggested Topics */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {SUGGESTED_TOPICS.map((topic) => (
                <button
                  key={topic.query}
                  onClick={() => toggleTopic(topic.query)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedTopics.includes(topic.query)
                      ? "bg-signal-coral text-white"
                      : "bg-white border border-gray-200 text-ink hover:border-signal-coral"
                  }`}
                >
                  {topic.label}
                </button>
              ))}
            </div>

            {/* Custom Topic Input */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Or type your own topic..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-signal-coral focus:ring-1 focus:ring-signal-coral outline-none"
                />
                {customTopic && (
                  <button
                    onClick={addCustomTopic}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-signal-coral text-white px-3 py-1 rounded text-sm"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>

            {/* Selected Topics */}
            {selectedTopics.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-ink-light mb-2">Selected:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTopics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1 bg-signal-coral/10 text-signal-coral px-3 py-1 rounded-full text-sm"
                    >
                      {topic}
                      <button
                        onClick={() => toggleTopic(topic)}
                        className="hover:text-signal-coral/70"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => setStep(3)}
                className="bg-signal-coral text-white px-8 py-3 rounded-full font-medium hover:bg-signal-coral/90 transition-colors"
              >
                Continue
              </button>
              <button
                onClick={skipOnboarding}
                className="text-ink-light hover:text-ink text-sm"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="text-center animate-fade-in">
            <div className="w-16 h-16 bg-signal-mint/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-signal-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-display text-2xl md:text-3xl text-ink mb-4">
              You&apos;re ready!
            </h2>

            {selectedTopics.length > 0 ? (
              <>
                <p className="text-ink-light mb-4">
                  We&apos;ll show you the latest on:
                </p>
                <ul className="text-ink mb-6 space-y-1">
                  {selectedTopics.map((topic) => (
                    <li key={topic}>• {topic}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-ink-light mb-6">
                You can add topics anytime from your dashboard.
              </p>
            )}

            {error && (
              <p className="text-red-500 text-sm mb-4">{error}</p>
            )}

            <button
              onClick={completeOnboarding}
              disabled={isSubmitting}
              className="bg-signal-coral text-white px-8 py-3 rounded-full font-medium hover:bg-signal-coral/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Setting up..." : "Go to Dashboard"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
