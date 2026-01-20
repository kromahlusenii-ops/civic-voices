"use client";

import Link from "next/link";
import { useEffect, useState, useRef, Fragment } from "react";

// Updated live voices - e-commerce brand focused
const LIVE_VOICES = [
  { platform: "TikTok", handle: "@skincare_obsessed", text: "Just tried that new serum from @glowbrand and my skin has never looked better. 10/10 would buy again", sentiment: "positive", time: "2m ago", engagement: "45K" },
  { platform: "Reddit", handle: "u/shopify_seller", text: "Anyone else notice conversion rates tanking after that algorithm change? My store went from 3% to 1.2%", sentiment: "negative", time: "5m ago", engagement: "234" },
  { platform: "X", handle: "@ecom_founder", text: "Hot take: Most DTC brands are spending 80% on acquisition and 0% on actually listening to customers", sentiment: "neutral", time: "8m ago", engagement: "1.2K" },
  { platform: "YouTube", handle: "Honest Reviews", text: "Unboxing this viral Shopify brand everyone's talking about... packaging is mid tbh", sentiment: "negative", time: "12m ago", engagement: "89K" },
  { platform: "Reddit", handle: "u/dtc_marketing", text: "Finally found a brand that actually responds to customer feedback. Rare W in ecommerce", sentiment: "positive", time: "15m ago", engagement: "567" },
  { platform: "TikTok", handle: "@beauty_finds", text: "POV: you order from a Shopify store and shipping takes 3 weeks. Never again.", sentiment: "negative", time: "18m ago", engagement: "234K" },
];

// Trending e-commerce topics
const TRENDING_TOPICS = [
  { topic: "shipping delays", change: "+34%", platform: "TikTok" },
  { topic: "product quality", change: "+52%", platform: "Reddit" },
  { topic: "customer service", change: "+28%", platform: "X" },
  { topic: "unboxing experience", change: "+41%", platform: "YouTube" },
  { topic: "return policy", change: "+19%", platform: "Reddit" },
  { topic: "price vs value", change: "+23%", platform: "TikTok" },
  { topic: "brand authenticity", change: "+15%", platform: "X" },
  { topic: "sustainability claims", change: "+37%", platform: "Reddit" },
];

// Platform status data - e-commerce focused
const PLATFORM_STATUS = [
  { name: "TikTok", posts: "2.1M", sentiment: 0.48, trend: "up" },
  { name: "Reddit", posts: "890K", sentiment: 0.42, trend: "down" },
  { name: "X", posts: "1.4M", sentiment: 0.45, trend: "up" },
  { name: "YouTube", posts: "560K", sentiment: 0.51, trend: "up" },
  { name: "Instagram", posts: "3.2M", sentiment: 0.55, trend: "stable" },
];

// Platform icons
function PlatformIcon({ platform, className = "" }: { platform: string; className?: string }) {
  const icons: Record<string, JSX.Element> = {
    X: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    Reddit: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
    TikTok: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
    YouTube: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    Instagram: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    Bluesky: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  };

  return icons[platform] || <span className="text-[10px] font-bold">{platform[0]}</span>;
}

// Live voice card component
function VoiceCard({ voice, delay = 0 }: { voice: typeof LIVE_VOICES[0]; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const sentimentColor = {
    positive: "border-l-emerald-500 bg-emerald-50/50",
    negative: "border-l-red-500 bg-red-50/50",
    neutral: "border-l-amber-500 bg-amber-50/50",
  }[voice.sentiment];

  const platformColors: Record<string, string> = {
    X: "bg-black text-white",
    Reddit: "bg-[#FF4500] text-white",
    TikTok: "bg-black text-white",
    YouTube: "bg-[#FF0000] text-white",
    Instagram: "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white",
  };
  const platformColor = platformColors[voice.platform] || "bg-gray-800 text-white";

  return (
    <div
      className={`border-l-4 ${sentimentColor} p-4 transition-all duration-500 hover:scale-[1.02] ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className={`flex items-center justify-center w-6 h-6 rounded ${platformColor}`}>
            <PlatformIcon platform={voice.platform} className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-mono text-stone-500">{voice.handle}</span>
        </div>
        <span className="text-[10px] font-mono text-stone-400 whitespace-nowrap">{voice.time}</span>
      </div>
      <p className="text-sm text-stone-800 leading-relaxed font-serif italic">&ldquo;{voice.text}&rdquo;</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] font-mono text-stone-400">{voice.engagement} engagements</span>
      </div>
    </div>
  );
}

// News ticker component
function NewsTicker() {
  return (
    <div className="relative overflow-hidden bg-stone-900 text-stone-100 py-2 border-b-2 border-violet-600">
      <div className="flex items-center">
        <div className="flex-shrink-0 px-4 border-r border-stone-700 flex items-center gap-2">
          <span className="w-2 h-2 bg-violet-600 rounded-full animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-violet-500">LIVE</span>
        </div>
        <div className="flex animate-marquee whitespace-nowrap">
          {[...TRENDING_TOPICS, ...TRENDING_TOPICS].map((item, i) => (
            <span key={i} className="mx-8 flex items-center gap-2 text-xs font-mono">
              <span className="text-stone-400">{item.platform}</span>
              <span className="text-stone-100">{item.topic}</span>
              <span className={`${item.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                {item.change}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Platform status board component
function PlatformStatusBoard() {
  return (
    <div className="font-mono text-xs">
      <div className="grid grid-cols-5 gap-px bg-stone-300 border border-stone-300">
        <div className="bg-stone-800 text-stone-300 p-2 text-center text-[10px] tracking-wider">PLATFORM</div>
        <div className="bg-stone-800 text-stone-300 p-2 text-center text-[10px] tracking-wider">POSTS/24H</div>
        <div className="bg-stone-800 text-stone-300 p-2 text-center text-[10px] tracking-wider">SENTIMENT</div>
        <div className="bg-stone-800 text-stone-300 p-2 text-center text-[10px] tracking-wider">TREND</div>
        <div className="bg-stone-800 text-stone-300 p-2 text-center text-[10px] tracking-wider">STATUS</div>
        {PLATFORM_STATUS.map((p) => (
          <Fragment key={p.name}>
            <div className="bg-stone-50 p-2 text-center font-bold">{p.name}</div>
            <div className="bg-stone-50 p-2 text-center tabular-nums">{p.posts}</div>
            <div className="bg-stone-50 p-2 text-center">
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    p.sentiment > 0.5 ? 'bg-emerald-500' : p.sentiment > 0.4 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${p.sentiment * 100}%` }}
                />
              </div>
            </div>
            <div className="bg-stone-50 p-2 text-center">
              {p.trend === 'up' && <span className="text-emerald-600">▲</span>}
              {p.trend === 'down' && <span className="text-red-600">▼</span>}
              {p.trend === 'stable' && <span className="text-stone-400">●</span>}
            </div>
            <div className="bg-stone-50 p-2 text-center">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-700 text-[10px]">ONLINE</span>
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// Scroll animation hook
function useScrollAnimation(options: { threshold?: number } = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: options.threshold ?? 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [options.threshold]);

  return { ref, isVisible };
}

// FAQ Item component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-stone-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left hover:bg-stone-50 transition-colors"
      >
        <span className="font-mono text-sm font-bold text-stone-900 pr-4">{question}</span>
        <span className="text-stone-400 flex-shrink-0">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="pb-5">
          <p className="font-body text-stone-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { ref: problemRef, isVisible: problemVisible } = useScrollAnimation();
  const { ref: personasRef, isVisible: personasVisible } = useScrollAnimation();
  const { ref: platformsRef, isVisible: platformsVisible } = useScrollAnimation();
  const { ref: featuresRef, isVisible: featuresVisible } = useScrollAnimation();
  const { ref: howItWorksRef, isVisible: howItWorksVisible } = useScrollAnimation();
  const { ref: useCasesRef, isVisible: useCasesVisible } = useScrollAnimation();
  const { ref: differentiationRef, isVisible: differentiationVisible } = useScrollAnimation();
  const { ref: pricingRef, isVisible: pricingVisible } = useScrollAnimation();
  const { ref: faqRef, isVisible: faqVisible } = useScrollAnimation();
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollAnimation();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());

    // Cycle through featured voice
    const interval = setInterval(() => {
      setCurrentVoiceIndex(prev => (prev + 1) % LIVE_VOICES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-stone-100 selection:bg-violet-600 selection:text-white overflow-x-hidden">
      {/* Custom styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&family=Newsreader:ital,wght@0,400;0,600;1,400&display=swap');

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .animate-marquee {
          animation: marquee 30s linear infinite;
        }

        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -10%); }
          20% { transform: translate(-15%, 5%); }
          30% { transform: translate(7%, -25%); }
          40% { transform: translate(-5%, 25%); }
          50% { transform: translate(-15%, 10%); }
          60% { transform: translate(15%, 0%); }
          70% { transform: translate(0%, 15%); }
          80% { transform: translate(3%, 35%); }
          90% { transform: translate(-10%, 10%); }
        }

        .grain::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          right: -50%;
          bottom: -50%;
          width: 200%;
          height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.04;
          pointer-events: none;
          animation: grain 8s steps(10) infinite;
        }

        .font-display {
          font-family: 'Instrument Serif', serif;
        }

        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }

        .font-body {
          font-family: 'Newsreader', serif;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.7s ease-out forwards;
        }

        .animate-fade-in-up-delay {
          animation: fadeInUp 0.7s ease-out 0.3s forwards;
          opacity: 0;
        }
      `}</style>

      {/* News Ticker - Top Bar */}
      <NewsTicker />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-stone-100/95 backdrop-blur-sm border-b border-stone-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-violet-600 flex items-center justify-center rounded">
                <span className="text-white font-mono text-xs font-bold">BY</span>
              </div>
              <div>
                <span className="font-display text-xl text-stone-900">Brand Yap</span>
                <span className="hidden sm:inline text-[10px] font-mono text-stone-500 ml-2 tracking-wider">FOR SHOPIFY BRANDS</span>
              </div>
            </div>

            {/* Nav Actions */}
            <div className="flex items-center gap-4">
              <Link
                href="/search?auth=true"
                className="text-xs font-mono text-stone-600 hover:text-stone-900 transition-colors tracking-wider"
              >
                LOG IN
              </Link>
              <Link
                href="/search"
                className="px-4 py-2 text-xs font-mono font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors tracking-wider rounded"
              >
                TRY FREE →
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative overflow-hidden grain">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column - Editorial */}
            <div className="lg:col-span-7 animate-fade-in-up">
              {/* Badge */}
              <div className="flex items-center gap-4 mb-6">
                <span className="px-3 py-1 bg-violet-600 text-white text-[10px] font-mono tracking-wider rounded">
                  SOCIAL LISTENING FOR SHOPIFY BRANDS
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-stone-900 leading-[0.95] mb-6 tracking-tight">
                Hear what customers
                <br />
                say <span className="italic">about your brand</span><span className="text-violet-600">.</span>
              </h1>

              {/* Subhead - Editorial style */}
              <div className="border-l-4 border-violet-600 pl-4 mb-8">
                <p className="font-body text-xl sm:text-2xl text-stone-700 leading-relaxed">
                  Search real conversations about your Shopify brand across TikTok, Reddit, YouTube, and X.
                  See what customers love, hate, and wish you&apos;d fix.
                </p>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Link
                  href="/search"
                  className="inline-flex items-center justify-center px-8 py-4 font-mono text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-all duration-300 tracking-wider group rounded"
                >
                  SEARCH YOUR BRAND FREE
                  <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
              <p className="text-[10px] font-mono text-stone-500">
                No credit card. No sales call. Just search.
              </p>
            </div>

            {/* Right Column - Live Feed Preview */}
            <div className="lg:col-span-5 animate-fade-in-up-delay">
              <div className="bg-white border-2 border-stone-900 shadow-[8px_8px_0px_0px_rgba(124,58,237,0.3)]">
                {/* Feed Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b-2 border-stone-900 bg-stone-50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-violet-600 rounded-full animate-pulse" />
                    <span className="text-[10px] font-mono font-bold tracking-wider">LIVE BRAND MENTIONS</span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500">
                    Your brand, all platforms
                  </span>
                </div>

                {/* Featured Voice */}
                <div className="p-4 border-b border-stone-200 bg-violet-50/30">
                  <div className="text-[10px] font-mono text-violet-600 font-bold mb-2 tracking-wider">TRENDING NOW</div>
                  <div className="space-y-1 transition-all duration-500">
                    <p className="font-body text-lg text-stone-800 italic leading-relaxed">
                      &ldquo;{LIVE_VOICES[currentVoiceIndex].text}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-stone-500">
                      <span>{LIVE_VOICES[currentVoiceIndex].platform}</span>
                      <span>•</span>
                      <span>{LIVE_VOICES[currentVoiceIndex].handle}</span>
                      <span>•</span>
                      <span>{LIVE_VOICES[currentVoiceIndex].time}</span>
                    </div>
                  </div>
                </div>

                {/* Voice Feed */}
                <div className="divide-y divide-stone-100 max-h-[320px] overflow-hidden">
                  {LIVE_VOICES.slice(0, 4).map((voice, i) => (
                    <VoiceCard key={i} voice={voice} delay={i * 150} />
                  ))}
                </div>

                {/* Feed Footer */}
                <div className="px-4 py-3 border-t-2 border-stone-900 bg-violet-600 text-white">
                  <Link href="/search" className="flex items-center justify-center gap-2 text-[10px] font-mono tracking-wider hover:text-violet-200 transition-colors">
                    SEARCH YOUR BRAND
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section ref={problemRef} className="py-16 lg:py-24 bg-white grain">
        <div className={`relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${problemVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl sm:text-5xl text-stone-900 leading-tight">
              Right now, about your brand<span className="text-violet-600">.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { platform: "TikTok", issue: "This brand's shipping is SO slow. 3 weeks for a $60 product??", subreddit: "@disappointed_buyer", engagement: "234K views" },
              { platform: "Reddit", issue: "Their customer service ghosted me after my order arrived damaged", subreddit: "r/Shopify", engagement: "847 upvotes" },
              { platform: "YouTube", issue: "Honest review: the quality does NOT match the price point", subreddit: "Product Reviews", engagement: "45K views" },
            ].map((item) => (
              <div key={item.issue} className="bg-stone-50 p-6 border-l-4 border-red-500">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-xs font-bold text-stone-500">{item.platform}</span>
                  <span className="text-stone-300">•</span>
                  <span className="text-xs text-stone-400">{item.subreddit}</span>
                </div>
                <p className="font-body text-stone-800 italic mb-3">&ldquo;{item.issue}&rdquo;</p>
                <span className="text-xs font-mono text-red-600">{item.engagement}</span>
              </div>
            ))}
          </div>

          <p className="text-center mt-10 font-body text-lg text-stone-600">
            Do you know what customers are saying about <span className="font-semibold text-stone-900">your</span> brand?
          </p>
        </div>
      </section>

      {/* Who It's For Section */}
      <section ref={personasRef} className="py-16 lg:py-24 bg-stone-100 grain">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={`transition-all duration-700 ${personasVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-[10px] font-mono text-stone-500 tracking-wider mb-4">WHO IT&apos;S FOR</div>
            <h2 className="font-display text-4xl sm:text-5xl text-stone-900 mb-12">
              Built for brands that
              <br />
              actually care about customers<span className="text-violet-600">.</span>
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Shopify Brand Founders */}
              <div className="bg-white p-8 border border-stone-200 hover:border-violet-600 transition-colors">
                <div className="w-12 h-12 bg-violet-600 flex items-center justify-center mb-6 rounded">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-mono text-sm font-bold text-stone-900 mb-3 tracking-wider">SHOPIFY BRAND FOUNDERS</h3>
                <p className="font-body text-lg text-stone-800 mb-4 font-semibold">Know what customers really think.</p>
                <p className="font-body text-stone-600 leading-relaxed">
                  Reviews only tell part of the story. See the unfiltered conversations happening on TikTok, Reddit, and YouTube
                  about your products, shipping, and customer experience.
                </p>
              </div>

              {/* E-commerce Marketing Teams */}
              <div className="bg-white p-8 border border-stone-200 hover:border-violet-600 transition-colors">
                <div className="w-12 h-12 bg-violet-600 flex items-center justify-center mb-6 rounded">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-mono text-sm font-bold text-stone-900 mb-3 tracking-wider">E-COMMERCE MARKETING TEAMS</h3>
                <p className="font-body text-lg text-stone-800 mb-4 font-semibold">Find your next viral moment.</p>
                <p className="font-body text-stone-600 leading-relaxed">
                  Discover UGC creators talking about your brand. Find complaints to turn into content.
                  Spot trends before your competitors do.
                </p>
              </div>

              {/* DTC Agencies */}
              <div className="bg-white p-8 border border-stone-200 hover:border-violet-600 transition-colors">
                <div className="w-12 h-12 bg-violet-600 flex items-center justify-center mb-6 rounded">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <h3 className="font-mono text-sm font-bold text-stone-900 mb-3 tracking-wider">DTC & SHOPIFY AGENCIES</h3>
                <p className="font-body text-lg text-stone-800 mb-4 font-semibold">Research any brand in seconds.</p>
                <p className="font-body text-stone-600 leading-relaxed">
                  Stop manually scrolling through platforms for client research. Search once, see everything,
                  export insights for your next strategy deck.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section ref={platformsRef} className="py-16 lg:py-24 bg-stone-900 grain">
        <div className={`relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${platformsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-12">
            <div className="text-[10px] font-mono text-stone-500 tracking-wider mb-4">PLATFORMS</div>
            <h2 className="font-display text-4xl sm:text-5xl text-white mb-4">
              Every platform where
              <br />
              customers talk<span className="text-violet-500">.</span> One search<span className="text-violet-500">.</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: "TikTok", desc: "Where products go viral (or get destroyed)", comingSoon: false },
              { name: "Reddit", desc: "r/Shopify, r/ecommerce, niche subreddits", comingSoon: false },
              { name: "YouTube", desc: "Unboxings, reviews, and honest takes", comingSoon: false },
              { name: "X", desc: "Real-time reactions and brand callouts", comingSoon: false },
              { name: "Instagram", desc: "Stories, comments, and tagged posts", comingSoon: true },
              { name: "Bluesky", desc: "Emerging platform for DTC conversation", comingSoon: false },
            ].map((platform) => (
              <div
                key={platform.name}
                className={`p-6 border transition-colors ${
                  platform.comingSoon
                    ? 'bg-violet-900/30 border-violet-500 hover:bg-violet-900/50'
                    : 'bg-stone-800/50 border-stone-700 hover:border-stone-500'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${
                    platform.comingSoon ? 'bg-violet-500' : 'bg-stone-700'
                  }`}>
                    <PlatformIcon platform={platform.name} className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-mono text-sm font-bold text-white">{platform.name}</span>
                  {platform.comingSoon && (
                    <span className="px-2 py-0.5 bg-amber-500 text-[8px] font-mono font-bold text-stone-900 tracking-wider">COMING SOON</span>
                  )}
                </div>
                <p className="text-xs text-stone-400">{platform.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-16 lg:py-24 bg-white grain">
        <div className={`relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-[10px] font-mono text-stone-500 tracking-wider mb-4">FEATURES</div>
          <h2 className="font-display text-4xl sm:text-5xl text-stone-900 mb-12">
            From search to insight
            <br />
            in seconds<span className="text-violet-600">.</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Cross-platform search", desc: "Search 6+ platforms at once for any brand or product", icon: "🔍" },
              { title: "Sentiment analysis", desc: "See if customers are happy, frustrated, or somewhere in between", icon: "📊" },
              { title: "Trend detection", desc: "Spot viral moments and emerging complaints early", icon: "📈" },
              { title: "Creator discovery", desc: "Find influencers and UGC creators talking about you", icon: "🎯" },
              { title: "Competitor tracking", desc: "See what customers say about competing brands", icon: "👀" },
              { title: "Message testing", desc: "Test new product ideas with synthetic audiences before launch", icon: "🧪" },
              { title: "CSV export", desc: "Download results for team reports or agency decks", icon: "📥" },
            ].map((feature) => (
              <div key={feature.title} className="p-6 border border-stone-200 hover:border-violet-600 transition-colors">
                <div className="text-2xl mb-3">{feature.icon}</div>
                <h3 className="font-mono text-sm font-bold text-stone-900 mb-2">{feature.title}</h3>
                <p className="font-body text-stone-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={howItWorksRef} className="py-16 lg:py-24 bg-stone-50 grain">
        <div className={`relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${howItWorksVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-12">
            <div className="text-[10px] font-mono text-stone-500 tracking-wider mb-4">HOW IT WORKS</div>
            <h2 className="font-display text-4xl sm:text-5xl text-stone-900">
              Three steps<span className="text-violet-600">.</span>
              <br />
              Know what customers think<span className="text-violet-600">.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Search your brand",
                desc: "Type your brand name, product, or any topic. Plain English works."
              },
              {
                step: "2",
                title: "See every conversation",
                desc: "TikTok videos, Reddit threads, YouTube comments, tweets—filtered by sentiment and engagement."
              },
              {
                step: "3",
                title: "Act on real feedback",
                desc: "Fix issues customers mention. Double down on what they love. Find creators to partner with."
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-violet-600 text-white font-display text-3xl flex items-center justify-center mx-auto mb-6 rounded">
                  {item.step}
                </div>
                <h3 className="font-mono text-sm font-bold text-stone-900 mb-3 tracking-wider">{item.title.toUpperCase()}</h3>
                <p className="font-body text-stone-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section ref={useCasesRef} className="py-16 lg:py-24 bg-white grain">
        <div className={`relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${useCasesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-[10px] font-mono text-stone-500 tracking-wider mb-4">USE CASES</div>
          <h2 className="font-display text-4xl sm:text-5xl text-stone-900 mb-12">
            What Shopify brands
            <br />
            use Brand Yap for<span className="text-violet-600">.</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Product feedback mining",
                desc: "See what customers actually say about your products—not just in reviews, but in honest TikToks and Reddit threads."
              },
              {
                title: "Shipping & CX monitoring",
                desc: "Spot complaints about shipping times, damaged packages, or customer service before they become a pattern."
              },
              {
                title: "Competitor intelligence",
                desc: "See what customers love and hate about competing brands. Find gaps you can fill."
              },
              {
                title: "Creator discovery",
                desc: "Find TikTokers and YouTubers already talking about your brand—or brands like yours."
              },
              {
                title: "Launch monitoring",
                desc: "Track real-time reactions when you drop a new product, run a sale, or change your pricing."
              },
            ].map((useCase) => (
              <div key={useCase.title} className="border-l-4 border-violet-600 pl-6 py-2">
                <h3 className="font-mono text-sm font-bold text-stone-900 mb-2">{useCase.title}</h3>
                <p className="font-body text-stone-600 leading-relaxed">{useCase.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiation Section */}
      <section ref={differentiationRef} className="py-16 lg:py-24 bg-stone-900 grain">
        <div className={`relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${differentiationVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl sm:text-5xl text-white">
              This isn&apos;t enterprise social listening<span className="text-violet-500">.</span>
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 gap-px bg-stone-700">
              {/* Headers */}
              <div className="bg-stone-800 p-4">
                <span className="font-mono text-xs font-bold text-stone-400 tracking-wider">SPROUT/BRANDWATCH</span>
              </div>
              <div className="bg-violet-900/50 p-4">
                <span className="font-mono text-xs font-bold text-violet-400 tracking-wider">BRAND YAP</span>
              </div>

              {/* Rows */}
              {[
                { generic: "Built for enterprise marketing teams", civic: "Built for Shopify founders & DTC brands" },
                { generic: "$500-2000+/month", civic: "Free to start, $99/mo for unlimited" },
                { generic: "Weeks of onboarding", civic: "Search in 30 seconds" },
                { generic: "Keyword tracking only", civic: "Search anything, anytime" },
                { generic: "No TikTok or Reddit", civic: "TikTok, Reddit, YouTube, X + more" },
              ].map((row, i) => (
                <Fragment key={i}>
                  <div className="bg-stone-800 p-4 flex items-center">
                    <span className="text-stone-400 font-body text-sm">{row.generic}</span>
                  </div>
                  <div className="bg-violet-900/30 p-4 flex items-center">
                    <span className="text-violet-200 font-body text-sm font-medium">{row.civic}</span>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Platform Status Board */}
      <section className="py-16 lg:py-24 bg-stone-50 grain">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left - Header */}
            <div>
              <div className="text-[10px] font-mono text-stone-500 tracking-wider mb-4">SYSTEM STATUS</div>
              <h2 className="font-display text-4xl sm:text-5xl text-stone-900 leading-tight mb-6">
                Monitoring the
                <br />
                <span className="italic">entire</span> conversation
                <span className="text-violet-600">.</span>
              </h2>
              <p className="font-body text-lg text-stone-600 leading-relaxed mb-8">
                Every platform. Every mention. Every shift in sentiment—captured in real-time
                and organized for immediate insight.
              </p>

              {/* Mini stats */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: "◉", label: "Real-time ingestion", desc: "Posts processed instantly" },
                  { icon: "◎", label: "Sentiment analysis", desc: "AI-powered classification" },
                  { icon: "◈", label: "Trend detection", desc: "Viral moments surfaced" },
                  { icon: "◇", label: "Creator matching", desc: "Influencer discovery built-in" },
                ].map((item, i) => (
                  <div key={i} className="p-4 border border-stone-200 hover:border-violet-600 transition-colors group">
                    <div className="text-2xl text-stone-300 group-hover:text-violet-600 transition-colors mb-2">{item.icon}</div>
                    <div className="font-mono text-xs font-bold text-stone-900 mb-1">{item.label}</div>
                    <div className="text-[10px] font-mono text-stone-500">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Status Board */}
            <div className="bg-white border-2 border-stone-900 shadow-[8px_8px_0px_0px_rgba(124,58,237,0.3)]">
              <div className="px-4 py-3 border-b-2 border-stone-900 bg-stone-50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold tracking-wider">PLATFORM STATUS BOARD</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    ALL SYSTEMS OPERATIONAL
                  </span>
                </div>
              </div>
              <div className="p-4">
                <PlatformStatusBoard />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section ref={pricingRef} className="py-16 lg:py-24 bg-white grain">
        <div className={`relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${pricingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-12">
            <div className="text-[10px] font-mono text-stone-500 tracking-wider mb-4">PRICING</div>
            <h2 className="font-display text-4xl sm:text-5xl text-stone-900">
              Built for Shopify budgets<span className="text-violet-600">.</span>
              <br />
              Start free<span className="text-violet-600">.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Free */}
            <div className="bg-stone-50 border border-stone-200 p-6 rounded-lg">
              <div className="font-mono text-xs font-bold text-stone-500 tracking-wider mb-2">FREE</div>
              <div className="font-display text-4xl text-stone-900 mb-4">$0<span className="text-lg text-stone-500">/mo</span></div>
              <ul className="space-y-2 mb-6">
                <li className="text-sm text-stone-600 flex items-start gap-2">
                  <span className="text-emerald-600">✓</span> 10 searches/month
                </li>
                <li className="text-sm text-stone-600 flex items-start gap-2">
                  <span className="text-emerald-600">✓</span> Basic sentiment analysis
                </li>
                <li className="text-sm text-stone-600 flex items-start gap-2">
                  <span className="text-emerald-600">✓</span> All platforms
                </li>
              </ul>
              <Link href="/search" className="block w-full py-3 text-center font-mono text-xs font-bold text-stone-900 border border-stone-900 hover:bg-stone-900 hover:text-white transition-colors rounded">
                START FREE →
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-violet-600 text-white border-2 border-violet-600 p-6 relative rounded-lg">
              <div className="absolute -top-3 left-4 px-2 py-1 bg-amber-400 text-[10px] font-mono font-bold tracking-wider text-stone-900 rounded">
                POPULAR
              </div>
              <div className="font-mono text-xs font-bold text-violet-200 tracking-wider mb-2">PRO</div>
              <div className="font-display text-4xl text-white mb-4">$99<span className="text-lg text-violet-200">/mo</span></div>
              <ul className="space-y-2 mb-6">
                <li className="text-sm text-violet-100 flex items-start gap-2">
                  <span className="text-emerald-300">✓</span> Unlimited searches
                </li>
                <li className="text-sm text-violet-100 flex items-start gap-2">
                  <span className="text-emerald-300">✓</span> Advanced filtering
                </li>
                <li className="text-sm text-violet-100 flex items-start gap-2">
                  <span className="text-emerald-300">✓</span> Synthetic audience testing
                </li>
                <li className="text-sm text-violet-100 flex items-start gap-2">
                  <span className="text-emerald-300">✓</span> Competitor tracking
                </li>
                <li className="text-sm text-violet-100 flex items-start gap-2">
                  <span className="text-emerald-300">✓</span> CSV export
                </li>
              </ul>
              <Link href="/search" className="block w-full py-3 text-center font-mono text-xs font-bold text-violet-600 bg-white hover:bg-violet-100 transition-colors rounded">
                START FREE, UPGRADE ANYTIME →
              </Link>
            </div>

            {/* Team */}
            <div className="bg-stone-50 border border-stone-200 p-6 rounded-lg">
              <div className="font-mono text-xs font-bold text-stone-500 tracking-wider mb-2">TEAM</div>
              <div className="font-display text-4xl text-stone-900 mb-4">$499<span className="text-lg text-stone-500">/mo</span></div>
              <ul className="space-y-2 mb-6">
                <li className="text-sm text-stone-600 flex items-start gap-2">
                  <span className="text-emerald-600">✓</span> Everything in Pro
                </li>
                <li className="text-sm text-stone-600 flex items-start gap-2">
                  <span className="text-emerald-600">✓</span> 5 seats
                </li>
                <li className="text-sm text-stone-600 flex items-start gap-2">
                  <span className="text-emerald-600">✓</span> Shared dashboards
                </li>
                <li className="text-sm text-stone-600 flex items-start gap-2">
                  <span className="text-emerald-600">✓</span> Priority support
                </li>
              </ul>
              <Link href="/search" className="block w-full py-3 text-center font-mono text-xs font-bold text-stone-900 border border-stone-900 hover:bg-stone-900 hover:text-white transition-colors rounded">
                CONTACT US →
              </Link>
            </div>

            {/* Agency */}
            <div className="bg-stone-50 border border-stone-200 p-6 rounded-lg">
              <div className="font-mono text-xs font-bold text-stone-500 tracking-wider mb-2">AGENCY</div>
              <div className="font-display text-4xl text-stone-900 mb-4">Custom</div>
              <ul className="space-y-2 mb-6">
                <li className="text-sm text-stone-600 flex items-start gap-2">
                  <span className="text-emerald-600">✓</span> Unlimited seats
                </li>
                <li className="text-sm text-stone-600 flex items-start gap-2">
                  <span className="text-emerald-600">✓</span> Multiple brands/clients
                </li>
                <li className="text-sm text-stone-600 flex items-start gap-2">
                  <span className="text-emerald-600">✓</span> White-label reports
                </li>
                <li className="text-sm text-stone-600 flex items-start gap-2">
                  <span className="text-emerald-600">✓</span> Dedicated support
                </li>
              </ul>
              <Link href="/search" className="block w-full py-3 text-center font-mono text-xs font-bold text-stone-900 border border-stone-900 hover:bg-stone-900 hover:text-white transition-colors rounded">
                TALK TO US →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section ref={faqRef} className="py-16 lg:py-24 bg-stone-50 grain">
        <div className={`relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${faqVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-12">
            <div className="text-[10px] font-mono text-stone-500 tracking-wider mb-4">FAQ</div>
            <h2 className="font-display text-4xl sm:text-5xl text-stone-900">
              Questions<span className="text-violet-600">?</span>
            </h2>
          </div>

          <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-lg">
            <FAQItem
              question="Who is Brand Yap for?"
              answer="Shopify brand founders, e-commerce marketing teams, and DTC agencies who want to know what customers are really saying about their brands online."
            />
            <FAQItem
              question="What platforms do you search?"
              answer="TikTok, Reddit, YouTube, X, Bluesky, and more. Instagram support is coming soon."
            />
            <FAQItem
              question="How is this different from Sprout Social or Brandwatch?"
              answer="Those tools are built for enterprise marketing teams with big budgets and long onboarding. Brand Yap is built for Shopify brands—affordable, instant, and focused on the platforms where e-commerce customers actually talk (TikTok, Reddit, YouTube)."
            />
            <FAQItem
              question="Can I track competitors?"
              answer="Yes. Search any brand name, product, or topic. See what customers are saying about your competitors too."
            />
            <FAQItem
              question="What's synthetic audience testing?"
              answer="Test your product descriptions, ad copy, or marketing messages on AI-generated audience segments before you launch. See how different customer types might react."
            />
            <FAQItem
              question="Is there a free trial?"
              answer="Yes. 10 free searches, no credit card required. Just start searching."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-20 lg:py-32 bg-violet-600 grain relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,255,255,0.1) 50px, rgba(255,255,255,0.1) 51px)`,
          }} />
        </div>

        <div className={`relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center transition-all duration-700 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-6">
            Know what customers
            <br />
            really think<span className="text-violet-200">.</span>
          </h2>
          <p className="font-body text-xl text-violet-100 max-w-2xl mx-auto mb-10 leading-relaxed">
            Search your brand. See every conversation. Free to start.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-10 py-5 font-mono text-sm font-bold text-violet-600 bg-white hover:bg-violet-100 transition-all duration-300 tracking-wider group rounded"
            >
              SEARCH YOUR BRAND FREE
              <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
          <p className="mt-8 text-[10px] font-mono text-violet-200">
            NO CREDIT CARD REQUIRED • NO SALES CALL
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-100 border-t border-stone-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Logo Column */}
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-violet-600 flex items-center justify-center rounded">
                  <span className="text-white font-mono text-xs font-bold">BY</span>
                </div>
                <span className="font-display text-xl text-stone-900">Brand Yap</span>
              </div>
              <p className="font-body text-stone-600 leading-relaxed mb-4">
                Social listening for Shopify brands.
              </p>
              <div className="flex gap-4">
                {["X", "LinkedIn"].map((social) => (
                  <Link key={social} href="#" className="text-[10px] font-mono text-stone-500 hover:text-stone-900 transition-colors tracking-wider">
                    {social.toUpperCase()}
                  </Link>
                ))}
              </div>
            </div>

            {/* Link Columns */}
            {[
              { title: "Product", links: ["Features", "Pricing", "API"] },
              { title: "Company", links: ["About", "Blog", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms"] },
            ].map((group, i) => (
              <div key={i}>
                <h4 className="font-mono text-[10px] font-bold text-stone-900 mb-4 tracking-wider">{group.title.toUpperCase()}</h4>
                <ul className="space-y-3">
                  {group.links.map((link) => (
                    <li key={link}>
                      <Link href="#" className="font-body text-sm text-stone-600 hover:text-stone-900 transition-colors">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-stone-300 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-mono text-stone-500">
              © {currentYear || "2025"} BRAND YAP. ALL RIGHTS RESERVED.
            </p>
            <p className="text-[10px] font-mono text-stone-400">
              SOCIAL LISTENING FOR SHOPIFY BRANDS
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
