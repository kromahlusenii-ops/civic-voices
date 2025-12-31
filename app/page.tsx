"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const TYPEWRITER_WORDS = ["Pains", "Needs", "Emotions", "Insights"];

export default function Home() {
  const [typewriterText, setTypewriterText] = useState(TYPEWRITER_WORDS[0]);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % TYPEWRITER_WORDS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTypewriterText(TYPEWRITER_WORDS[wordIndex]);
  }, [wordIndex]);

  return (
    <main className="min-h-screen bg-navy">
      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 border-b border-navy-border bg-navy/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="text-xl font-bold text-white">Civic Voices</div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border-2 border-white px-6 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-navy"
              data-testid="nav-login"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-navy transition hover:bg-gray-100"
              data-testid="nav-signup"
            >
              Try for free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden pt-20">
        {/* Center Content */}
        <div className="relative mx-auto max-w-4xl px-4 py-32 text-center sm:px-6 lg:px-8">
          {/* Badge Row */}
          <div className="mb-8 flex flex-wrap justify-center gap-3">
            <span className="rounded-full border border-navy-border bg-navy-dark px-4 py-1.5 text-xs text-gray-300">
              Featured Tool
            </span>
            <span className="rounded-full border border-navy-border bg-navy-dark px-4 py-1.5 text-xs text-gray-300">
              Civic Partner
            </span>
            <span className="rounded-full border border-navy-border bg-navy-dark px-4 py-1.5 text-xs text-gray-300">
              Innovation Award
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
            Research Social Media Conversations for
          </h1>

          {/* Typewriter */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <span
              className="text-4xl font-bold text-accent-blue sm:text-5xl lg:text-6xl"
              data-testid="typewriter-text"
            >
              {typewriterText}
            </span>
            <span className="inline-block h-12 w-1 animate-blink bg-accent-blue sm:h-14 lg:h-16" />
          </div>

          {/* Subtitle */}
          <p className="mt-8 text-lg text-gray-300 sm:text-xl">
            Understand what your community truly thinks. Analyze conversations
            across Reddit, X, TikTok, and more to uncover real insights that
            drive better decisions.
          </p>

          {/* CTA */}
          <div className="mt-10">
            <Link
              href="/signup"
              className="inline-block rounded-full bg-white px-10 py-4 text-base font-semibold text-navy shadow-lg transition hover:bg-gray-100"
              data-testid="hero-cta"
            >
              Try for free
            </Link>
          </div>

          {/* Platform Badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {["Reddit", "X", "TikTok", "Instagram", "LinkedIn", "YouTube"].map(
              (platform) => (
                <div
                  key={platform}
                  className="flex items-center gap-2 rounded-lg border border-navy-border bg-navy-dark px-4 py-2"
                >
                  <div className="h-5 w-5 rounded bg-accent-blue/20" />
                  <span className="text-sm text-gray-400">{platform}</span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y border-navy-border bg-navy-dark py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-gray-400">
            Trusted by teams exploring civic sentiment
          </p>
          <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-5">
            {[
              "Org A",
              "Org B",
              "Org C",
              "Org D",
              "Org E",
              "Org F",
              "Org G",
              "Org H",
              "Org I",
              "Org J",
            ].map((name, i) => (
              <div
                key={i}
                className="flex items-center justify-center rounded-lg bg-navy-secondary p-4"
              >
                <div className="text-center text-sm font-medium text-gray-500">
                  {name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-gray-50 py-24" data-testid="use-cases-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-gray-500">
            Use cases
          </div>
          <h2 className="text-center text-4xl font-bold text-gray-900 sm:text-5xl">
            Build narratives that resonate
          </h2>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Analyze conversations",
                description: "Deep-dive into community discussions and sentiment",
                metric: "10k+ analyzed",
              },
              {
                title: "Synthetic audiences",
                description: "Segment and understand audience demographics",
                metric: "89% accuracy",
              },
              {
                title: "Market insights",
                description: "Discover unmet needs and pain points",
                metric: "304k insights",
              },
              {
                title: "Competitor research",
                description: "Track what people say about alternatives",
                metric: "Real-time",
              },
              {
                title: "Track narratives",
                description: "Follow evolving stories and themes",
                metric: "Live updates",
              },
              {
                title: "Go beyond sentiment",
                description: "Understand nuanced emotions and context",
                metric: "12 emotions",
              },
              {
                title: "Engage communities",
                description: "AI-powered reply drafts for authentic engagement",
                metric: "Beta",
              },
              {
                title: "Export insights",
                description: "Share findings with your team seamlessly",
                metric: "CSV, PDF",
              },
            ].map((useCase, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white p-6 shadow-md transition hover:scale-105 hover:shadow-xl"
                data-testid="use-case-card"
              >
                <h3 className="text-lg font-bold text-gray-900">
                  {useCase.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {useCase.description}
                </p>
                <div className="mt-4 h-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50" />
                <div className="mt-3 text-xs font-medium text-accent-blue">
                  {useCase.metric}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-navy py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-gray-500">
            People say
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                quote:
                  "Civic Voices helped us understand community sentiment before launching our initiative. The insights were invaluable.",
                name: "Alex Rivera",
                title: "Community Organizer",
                org: "Local Impact Fund",
              },
              {
                quote:
                  "We reduced our research time by 70% and made better decisions by understanding what truly matters to our audience.",
                name: "Jordan Lee",
                title: "Strategy Director",
                org: "Policy Lab",
              },
              {
                quote:
                  "Finally, a tool that helps us track community conversations in real-time across multiple platforms.",
                name: "Sam Chen",
                title: "Research Lead",
                org: "Civic Tech Collective",
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="rounded-2xl bg-navy-secondary p-8 shadow-xl"
                data-testid="testimonial-card"
              >
                <p className="text-base text-gray-300">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="mt-6">
                  <p className="font-bold text-accent-blue">{testimonial.name}</p>
                  <p className="text-sm text-gray-400">
                    {testimonial.title}, {testimonial.org}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Reports */}
      <section className="border-y border-navy-border bg-navy-dark py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-4xl font-bold text-white sm:text-5xl">
            Discover what your community is saying
          </h2>

          {/* Platform Filter Pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {["Reddit", "TikTok", "YouTube", "Instagram", "X", "LinkedIn"].map(
              (platform) => (
                <button
                  key={platform}
                  className="rounded-full border border-navy-border bg-navy px-5 py-2 text-sm font-medium text-gray-300 transition hover:bg-navy-secondary"
                >
                  {platform}
                </button>
              )
            )}
          </div>

          {/* Horizontal Scroll Carousel */}
          <div className="mt-12 overflow-x-auto pb-4">
            <div className="flex gap-6">
              {[
                {
                  title: "Community Housing Initiative Discussion",
                  views: "12.4k",
                  platform: "Reddit",
                },
                {
                  title: "Local Transportation Sentiment",
                  views: "8.9k",
                  platform: "X",
                },
                {
                  title: "Education Policy Reactions",
                  views: "15.2k",
                  platform: "TikTok",
                },
                {
                  title: "Environmental Concerns Thread",
                  views: "6.7k",
                  platform: "Reddit",
                },
                {
                  title: "Economic Development Feedback",
                  views: "9.3k",
                  platform: "LinkedIn",
                },
                {
                  title: "Public Health Initiative Commentary",
                  views: "11.8k",
                  platform: "YouTube",
                },
                {
                  title: "Safety Measures Discussion",
                  views: "7.1k",
                  platform: "Instagram",
                },
                {
                  title: "Community Events Engagement",
                  views: "5.4k",
                  platform: "X",
                },
              ].map((report, i) => (
                <div
                  key={i}
                  className="min-w-[280px] rounded-2xl bg-navy p-6 shadow-lg"
                >
                  <div className="mb-3 inline-block rounded bg-navy-border px-3 py-1 text-xs text-gray-400">
                    {report.platform}
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {report.title}
                  </h3>
                  <div className="mt-4 text-sm text-gray-400">
                    {report.views} views (example)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-gray-500">
            Features
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "AI-first conversation analysis",
              "Multi-platform ready architecture",
              "Analyze by keyword or link",
              "Localize by language",
              "Export insights to CSV/PDF",
              "Narrative watchlists",
              "Sentiment trend tracking",
              "Custom date range filtering",
              "Team collaboration",
              "Real-time updates",
              "Verified quote extraction",
              "Privacy-focused design",
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <svg
                  className="mt-1 h-5 w-5 flex-shrink-0 text-accent-blue"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-900">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mid-page CTA */}
      <section className="bg-navy py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white sm:text-5xl">
            Start understanding your community today
          </h2>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-full bg-white px-10 py-4 text-base font-semibold text-navy transition hover:bg-gray-100"
            >
              Try for free
            </Link>
            <button className="rounded-full border-2 border-white px-10 py-4 text-base font-semibold text-white transition hover:bg-white hover:text-navy">
              Book a demo
            </button>
          </div>
          <p className="mt-6 text-sm text-gray-400">Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-border bg-navy-secondary text-gray-400">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <h3 className="text-lg font-bold text-white">About</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link
                    href="#"
                    className="transition hover:text-accent-blue"
                  >
                    Our Story
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="transition hover:text-accent-blue"
                  >
                    Team
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="transition hover:text-accent-blue"
                  >
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Contact</h4>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link
                    href="#"
                    className="transition hover:text-accent-blue"
                  >
                    Support
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="transition hover:text-accent-blue"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="transition hover:text-accent-blue"
                  >
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Legal</h4>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link
                    href="#"
                    className="transition hover:text-accent-blue"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="transition hover:text-accent-blue"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="transition hover:text-accent-blue"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-navy-border pt-8 text-center text-sm">
            <p>&copy; 2025 Civic Voices. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
