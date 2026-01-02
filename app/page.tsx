"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const TYPEWRITER_WORDS = ["Opinions", "Trends", "Shifts", "Narratives"];

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
              href="/search?auth=true"
              className="rounded-full border-2 border-white px-6 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-navy"
              data-testid="nav-login"
            >
              Log in
            </Link>
            <Link
              href="/search"
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
              Cross-Platform Intelligence
            </span>
            <span className="rounded-full border border-navy-border bg-navy-dark px-4 py-1.5 text-xs text-gray-300">
              Real Conversations
            </span>
            <span className="rounded-full border border-navy-border bg-navy-dark px-4 py-1.5 text-xs text-gray-300">
              Live Data
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
            Track What Americans Think About
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
            Understand what Americans think across social media.
          </p>

          {/* CTA */}
          <div className="mt-10">
            <Link
              href="/search"
              className="inline-block rounded-full bg-white px-10 py-4 text-base font-semibold text-navy shadow-lg transition hover:bg-gray-100"
              data-testid="hero-cta"
            >
              Try for free
            </Link>
          </div>

          {/* Platform Badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {["X", "Reddit", "TikTok", "Instagram", "YouTube", "Forums"].map(
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
            Used by journalists, researchers, campaigns, and marketing teams
          </p>
          <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-5">
            {[
              { name: "Amazon", logo: "/logos/amazon-logo-transparent.png", width: 120, height: 40 },
              { name: "Google", logo: "/logos/Google_2015_logo.png", width: 120, height: 40 },
              { name: "Microsoft", logo: "/logos/Microsoft-Logo.png", width: 140, height: 40 },
              { name: "NCIDEA", logo: "/logos/NC-IDEA-logo.png", width: 120, height: 40 },
              { name: "TikTok", logo: "/logos/TikTok_logo.png", width: 100, height: 40 },
            ].map((company, i) => (
              <div
                key={i}
                className="flex items-center justify-center rounded-lg bg-navy-secondary p-6"
              >
                <Image
                  src={company.logo}
                  alt={company.name}
                  width={company.width}
                  height={company.height}
                  className="h-10 w-auto object-contain opacity-80 transition hover:opacity-100"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-gray-50 py-24" data-testid="use-cases-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-gray-500">
            Why It Works
          </div>
          <h2 className="text-center text-4xl font-bold text-gray-900 sm:text-5xl">
            Cross-platform coverage shows the full picture
          </h2>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "See what they're saying",
                description: "Monitor conversations across six major platforms",
                metric: "6 platforms",
              },
              {
                title: "Spot emerging narratives",
                description: "Track how topics spread and evolve over time",
                metric: "Real-time",
              },
              {
                title: "Understand the why",
                description: "Context and sentiment beyond keyword matching",
                metric: "Full context",
              },
              {
                title: "Find the patterns",
                description: "What issues connect. What messaging works",
                metric: "Pattern detection",
              },
              {
                title: "Track demographic shifts",
                description: "How different groups talk about the same topic",
                metric: "Audience segments",
              },
              {
                title: "Compare competitors",
                description: "What people say about you versus alternatives",
                metric: "Competitive intel",
              },
              {
                title: "Export what matters",
                description: "Share findings with stakeholders instantly",
                metric: "CSV, PDF",
              },
              {
                title: "Watch multiple topics",
                description: "Monitor keywords, hashtags, or specific threads",
                metric: "Custom tracking",
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
            Who Uses This
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                quote:
                  "We track how narratives form on TikTok and spread to X. The pattern recognition across platforms changed how we report.",
                name: "Alex Rivera",
                title: "Investigative Reporter",
                org: "National Newsroom",
              },
              {
                quote:
                  "Reddit conversations told us what messaging would fail before we tested it. Saved us three months of repositioning.",
                name: "Jordan Lee",
                title: "Brand Strategy Lead",
                org: "Consumer Marketing Firm",
              },
              {
                quote:
                  "We see opinion shifts as they happen. YouTube comments. Forum threads. Instagram reactions. All in one view.",
                name: "Sam Chen",
                title: "Policy Research Director",
                org: "Think Tank",
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
            Example insights you can track
          </h2>

          {/* Platform Filter Pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {["X", "Reddit", "TikTok", "Instagram", "YouTube", "Forums"].map(
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
                  title: "Housing affordability concerns increased 34% on Reddit this month",
                  views: "12.4k posts",
                  platform: "Reddit",
                },
                {
                  title: "EV skepticism grew among truck owners on X and YouTube",
                  views: "8.9k mentions",
                  platform: "X",
                },
                {
                  title: "Gen Z shifted from concern to ridicule on climate messaging",
                  views: "15.2k videos",
                  platform: "TikTok",
                },
                {
                  title: "Return-to-office resistance peaked in tech forums last week",
                  views: "6.7k threads",
                  platform: "Forums",
                },
                {
                  title: "Small business owners distrust economic optimism narratives",
                  views: "9.3k comments",
                  platform: "YouTube",
                },
                {
                  title: "Parents using 'gentle parenting' ironically on Instagram now",
                  views: "11.8k posts",
                  platform: "Instagram",
                },
                {
                  title: "AI concerns split by age: tools vs. threats",
                  views: "7.1k discussions",
                  platform: "Reddit",
                },
                {
                  title: "Brand boycott language changed from moral to economic framing",
                  views: "5.4k tweets",
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
                    {report.views} analyzed
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
            How It Works
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Search any topic or paste a link",
              "We pull from X, Reddit, TikTok, Instagram, YouTube, forums",
              "See sentiment trends over time",
              "Compare how different groups talk",
              "Spot emerging narratives early",
              "Track competitors and alternatives",
              "Export findings to CSV or PDF",
              "Filter by date range or platform",
              "Monitor multiple topics at once",
              "Get real-time updates when patterns shift",
              "Extract verified quotes with context",
              "Share insights with your team",
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

      {/* Who It's For Section */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-gray-500">
            Who Uses This
          </div>
          <h2 className="text-center text-4xl font-bold text-gray-900 sm:text-5xl">
            Built for teams who need to know what Americans think
          </h2>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                role: "Journalists",
                need: "Find emerging stories before they break. Verify what people are actually saying.",
              },
              {
                role: "Researchers",
                need: "Track opinion formation across platforms. Export data for deeper analysis.",
              },
              {
                role: "Marketing Teams",
                need: "See what messaging resonates. Understand why campaigns fail or succeed.",
              },
              {
                role: "Campaign Staff",
                need: "Monitor how narratives spread. Know what issues are gaining or losing ground.",
              },
              {
                role: "Policy Teams",
                need: "Gauge public reaction in real time. Find the gaps between official statements and lived experience.",
              },
              {
                role: "Brand Strategists",
                need: "Track competitor perception. Spot reputation shifts as they happen.",
              },
            ].map((persona, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-8"
              >
                <h3 className="text-xl font-bold text-gray-900">
                  {persona.role}
                </h3>
                <p className="mt-4 text-gray-600">{persona.need}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mid-page CTA */}
      <section className="bg-navy py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white sm:text-5xl">
            See what Americans are saying right now
          </h2>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/search"
              className="rounded-full bg-white px-10 py-4 text-base font-semibold text-navy transition hover:bg-gray-100"
            >
              Try for free
            </Link>
            <button className="rounded-full border-2 border-white px-10 py-4 text-base font-semibold text-white transition hover:bg-white hover:text-navy">
              Book a demo
            </button>
          </div>
          <p className="mt-6 text-sm text-gray-400">No credit card required</p>
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
