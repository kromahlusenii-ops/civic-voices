"use client";

import { useState } from "react";
import statesData from "@/data/states.json";
import citiesData from "@/data/cities.json";

interface LocalComingSoonProps {
  query: string;
  selectedState: string | null;
  selectedCity: string | null;
  onBackToNational: () => void;
}

interface City {
  id: string;
  name: string;
}

export default function LocalComingSoon({
  query,
  selectedState,
  selectedCity,
  onBackToNational,
}: LocalComingSoonProps) {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const stateName = statesData.find((s) => s.id === selectedState)?.name;
  const cityName = selectedState
    ? (citiesData as Record<string, City[]>)[selectedState]?.find((c) => c.id === selectedCity)?.name
    : null;

  const locationText = cityName && stateName
    ? `${cityName}, ${stateName}`
    : stateName
    ? stateName
    : "your selected location";

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder - would integrate with actual waitlist service
    console.log("Waitlist signup:", { email, query, selectedState, selectedCity });
    setIsSubmitted(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg text-center">
        {/* Coming Soon Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Coming Soon
        </div>

        {/* Heading */}
        <h1 className="mb-4 text-2xl font-semibold text-gray-900">
          Local Search for {locationText}
        </h1>

        {/* Description */}
        <p className="mb-8 text-gray-600">
          We&apos;re working hard to bring hyper-local social listening to your city.
          Join the waitlist to be the first to know when local search is available.
        </p>

        {/* Search Query Preview */}
        {query && (
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500 mb-2">Your search query:</p>
            <p className="font-medium text-gray-900">&quot;{query}&quot;</p>
            <p className="text-sm text-gray-500 mt-2">
              in {locationText}
            </p>
          </div>
        )}

        {/* Waitlist Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {!isSubmitted ? (
            <>
              <h2 className="mb-4 text-lg font-medium text-gray-900">
                Get notified when local search launches
              </h2>
              <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                  >
                    Join Waitlist
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  We&apos;ll only email you when local search is ready. No spam, ever.
                </p>
              </form>
            </>
          ) : (
            <div className="py-4">
              <div className="mb-4 inline-flex items-center justify-center rounded-full bg-green-100 p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">You&apos;re on the list!</h3>
              <p className="text-sm text-gray-600">
                We&apos;ll let you know as soon as local search is available for {locationText}.
              </p>
            </div>
          )}
        </div>

        {/* Back to National Search */}
        <button
          onClick={onBackToNational}
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Search nationally instead
        </button>

        {/* Features Coming */}
        <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 inline-flex rounded-lg bg-blue-100 p-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900">City-level search</h3>
            <p className="mt-1 text-xs text-gray-500">Filter by specific metros and neighborhoods</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 inline-flex rounded-lg bg-purple-100 p-2">
              <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900">Local trends</h3>
            <p className="mt-1 text-xs text-gray-500">See what&apos;s trending in your community</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 inline-flex rounded-lg bg-green-100 p-2">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900">Community voices</h3>
            <p className="mt-1 text-xs text-gray-500">Hear from local residents and influencers</p>
          </div>
        </div>
      </div>
    </div>
  );
}
