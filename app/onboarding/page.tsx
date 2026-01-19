"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);

  const completeOnboarding = useCallback(async () => {
    if (isCompleting) return;
    setIsCompleting(true);

    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: [], skipped: true }),
      });
    } catch (err) {
      console.error("Error completing onboarding:", err);
    }

    router.push("/search");
  }, [isCompleting, router]);

  // Auto-complete onboarding after a brief welcome
  useEffect(() => {
    const timer = setTimeout(completeOnboarding, 2000);
    return () => clearTimeout(timer);
  }, [completeOnboarding]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center animate-fade-in">
        <div className="w-16 h-16 bg-signal-mint/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-signal-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-ink mb-4">
          Welcome to Civic Voices
        </h1>
        <p className="text-ink-light text-lg mb-8 max-w-md mx-auto">
          Setting up your account...
        </p>
        <div className="flex justify-center">
          <div className="w-6 h-6 border-2 border-signal-coral border-t-transparent rounded-full animate-spin" />
        </div>
        <button
          onClick={completeOnboarding}
          disabled={isCompleting}
          className="mt-8 text-ink-light hover:text-ink text-sm transition-colors"
        >
          Skip to dashboard
        </button>
      </div>
    </div>
  );
}
