"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef, Fragment } from "react";

// Company logos data - preserved from original
const COMPANY_LOGOS = [
  { name: "Google", src: "/logos/Google_2015_logo.png", width: 100, height: 34 },
  { name: "Microsoft", src: "/logos/Microsoft-Logo.png", width: 120, height: 26 },
  { name: "Amazon", src: "/logos/amazon-logo-transparent.png", width: 100, height: 30 },
  { name: "TikTok", src: "/logos/TikTok_logo.png", width: 100, height: 29 },
  { name: "NC IDEA", src: "/logos/NC-IDEA-logo.png", width: 90, height: 40 },
  { name: "Washington Post", src: "/logos/the-washington-post-logo-svg-vector.svg", width: 140, height: 22 },
  { name: "Bank of America", src: "/logos/bank-of-america-logo.png", width: 140, height: 28 },
];

// Simulated live voice data - actual social posts feeling
const LIVE_VOICES = [
  { platform: "X", handle: "@midwest_dad_47", text: "Nobody asked us about these EV mandates. We can't even charge them out here.", sentiment: "negative", time: "2m ago", engagement: "1.2K" },
  { platform: "Reddit", handle: "u/first_gen_homebuyer", text: "Just got outbid by $80k cash offer. 6th house this year. Starting to lose hope.", sentiment: "negative", time: "5m ago", engagement: "3.4K" },
  { platform: "TikTok", handle: "@nursemaria_rn", text: "Day 847 of hospital admin pretending we're not understaffed 🙃", sentiment: "negative", time: "8m ago", engagement: "45K" },
  { platform: "YouTube", handle: "SmallBizSteve", text: "The 'economic recovery' everyone talks about hasn't reached Main Street yet.", sentiment: "neutral", time: "12m ago", engagement: "892" },
  { platform: "X", handle: "@climate_hopeful", text: "Young people aren't apathetic, we're exhausted from being told to fix problems we didn't create", sentiment: "neutral", time: "15m ago", engagement: "8.7K" },
  { platform: "Reddit", handle: "u/rural_teacher_OH", text: "My students have more hope than the news gives them credit for. They're organizing.", sentiment: "positive", time: "18m ago", engagement: "2.1K" },
];

// Trending topics ticker
const TRENDING_TOPICS = [
  { topic: "housing affordability", change: "+34%", platform: "Reddit" },
  { topic: "EV infrastructure", change: "+28%", platform: "X" },
  { topic: "healthcare burnout", change: "+52%", platform: "TikTok" },
  { topic: "AI job displacement", change: "+41%", platform: "YouTube" },
  { topic: "local journalism", change: "+19%", platform: "All" },
  { topic: "rural broadband", change: "+23%", platform: "Reddit" },
  { topic: "teacher retention", change: "+37%", platform: "X" },
  { topic: "small business loans", change: "+15%", platform: "YouTube" },
];

// Platform status data
const PLATFORM_STATUS = [
  { name: "X", posts: "2.4M", sentiment: 0.42, trend: "up" },
  { name: "TikTok", posts: "890K", sentiment: 0.38, trend: "down" },
  { name: "Reddit", posts: "1.1M", sentiment: 0.51, trend: "up" },
  { name: "YouTube", posts: "340K", sentiment: 0.45, trend: "stable" },
  { name: "Bluesky", posts: "156K", sentiment: 0.62, trend: "up" },
];

// Sentiment wave visualization component
function SentimentWave({ className = "" }: { className?: string }) {
  const [points, setPoints] = useState<number[]>([]);

  useEffect(() => {
    // Generate initial wave
    const generateWave = () => {
      const newPoints = [];
      for (let i = 0; i < 50; i++) {
        newPoints.push(30 + Math.sin(i * 0.3) * 15 + Math.random() * 10);
      }
      return newPoints;
    };

    setPoints(generateWave());

    const interval = setInterval(() => {
      setPoints(prev => {
        const newPoints = [...prev.slice(1), 30 + Math.sin(Date.now() * 0.002) * 15 + Math.random() * 10];
        return newPoints;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const pathD = points.length > 0
    ? `M 0 ${points[0]} ` + points.map((p, i) => `L ${i * 20} ${p}`).join(' ')
    : '';

  return (
    <svg className={className} viewBox="0 0 980 60" preserveAspectRatio="none">
      <defs>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E53935" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#FFC107" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4CAF50" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <path
        d={pathD}
        fill="none"
        stroke="url(#waveGradient)"
        strokeWidth="2"
        className="transition-all duration-100"
      />
      <path
        d={pathD + ` L 980 60 L 0 60 Z`}
        fill="url(#waveGradient)"
        className="transition-all duration-100"
      />
    </svg>
  );
}

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
  };

  return icons[platform] || <span className="text-[10px] font-bold">{platform}</span>;
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
    <div className="relative overflow-hidden bg-stone-900 text-stone-100 py-2 border-b-2 border-red-600">
      <div className="flex items-center">
        <div className="flex-shrink-0 px-4 border-r border-stone-700 flex items-center gap-2">
          <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-red-500">LIVE</span>
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

export default function Home() {
  const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const { ref: voicesRef, isVisible: voicesVisible } = useScrollAnimation();
  const { ref: statusRef, isVisible: statusVisible } = useScrollAnimation();
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollAnimation();

  useEffect(() => {
    // Cycle through featured voice
    const interval = setInterval(() => {
      setCurrentVoiceIndex(prev => (prev + 1) % LIVE_VOICES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-stone-100 selection:bg-red-600 selection:text-white">
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
              <div className="w-8 h-8 bg-stone-900 flex items-center justify-center">
                <span className="text-stone-100 font-mono text-xs font-bold">CV</span>
              </div>
              <div>
                <span className="font-display text-xl text-stone-900">Civic Voices</span>
                <span className="hidden sm:inline text-[10px] font-mono text-stone-500 ml-2 tracking-wider">SOCIAL INTELLIGENCE</span>
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
                className="px-4 py-2 text-xs font-mono font-bold text-stone-100 bg-stone-900 hover:bg-red-600 transition-colors tracking-wider"
              >
                START FREE →
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Editorial Style */}
      <section ref={heroRef} className="relative overflow-hidden grain">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column - Editorial */}
            <div className="lg:col-span-7 animate-fade-in-up">
              {/* Date stamp */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-[10px] font-mono text-stone-500 tracking-wider">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-red-600">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                  LIVE MONITORING
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-stone-900 leading-[0.95] mb-6 tracking-tight">
                What America
                <br />
                <span className="italic">actually</span> thinks
                <span className="text-red-600">.</span>
              </h1>

              {/* Subhead - Editorial style */}
              <div className="border-l-4 border-stone-900 pl-4 mb-8">
                <p className="font-body text-xl sm:text-2xl text-stone-700 leading-relaxed">
                  Real-time intelligence from X, TikTok, Reddit, YouTube, and beyond.
                  See public sentiment <em>before</em> it becomes news.
                </p>
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap gap-8 mb-8 py-4 border-y border-stone-300">
                {[
                  { value: "12M+", label: "posts analyzed daily" },
                  { value: "6", label: "platforms monitored" },
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="font-mono text-2xl sm:text-3xl font-bold text-stone-900">{stat.value}</div>
                    <div className="text-[10px] font-mono text-stone-500 tracking-wider uppercase">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/search"
                  className="inline-flex items-center justify-center px-8 py-4 font-mono text-sm font-bold text-stone-100 bg-stone-900 hover:bg-red-600 transition-all duration-300 tracking-wider group"
                >
                  START FREE
                  <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right Column - Live Feed Preview */}
            <div className="lg:col-span-5 animate-fade-in-up-delay">
              <div className="bg-white border-2 border-stone-900 shadow-[8px_8px_0px_0px_rgba(28,25,23,1)]">
                {/* Feed Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b-2 border-stone-900 bg-stone-50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                    <span className="text-[10px] font-mono font-bold tracking-wider">LIVE VOICE STREAM</span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500">
                    {LIVE_VOICES.length} active sources
                  </span>
                </div>

                {/* Featured Voice */}
                <div className="p-4 border-b border-stone-200 bg-red-50/30">
                  <div className="text-[10px] font-mono text-red-600 font-bold mb-2 tracking-wider">FEATURED VOICE</div>
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
                <div className="px-4 py-3 border-t-2 border-stone-900 bg-stone-900 text-stone-100">
                  <Link href="/search" className="flex items-center justify-center gap-2 text-[10px] font-mono tracking-wider hover:text-red-400 transition-colors">
                    START FREE
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

      {/* Sentiment Wave Visualization */}
      <section className="relative py-8 bg-stone-900 overflow-hidden">
        <div className="absolute inset-0">
          <SentimentWave className="w-full h-full" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-stone-400 tracking-wider">NATIONAL SENTIMENT INDEX</span>
              <span className="font-mono text-2xl font-bold text-emerald-400">+0.42</span>
            </div>
            <div className="flex items-center gap-6 text-[10px] font-mono text-stone-500">
              <span className="flex items-center gap-2">
                <span className="w-3 h-1 bg-emerald-500" /> Positive
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-1 bg-amber-500" /> Neutral
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-1 bg-red-500" /> Negative
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases - Magazine Layout */}
      <section className="py-16 lg:py-24 bg-stone-100 grain">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-[10px] font-mono text-stone-500 tracking-wider mb-4">WHO IT&apos;S FOR</div>
          <h2 className="font-display text-4xl sm:text-5xl text-stone-900 mb-12">
            Built for those who
            <br />
            <span className="italic">need to know</span>
            <span className="text-red-600">.</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-300">
            {[
              { role: "Journalists", icon: "◆", desc: "Find emerging stories before they break. Verify what people are actually saying." },
              { role: "Researchers", icon: "◇", desc: "Track opinion formation across platforms. Export data for deeper analysis." },
              { role: "Marketing Teams", icon: "○", desc: "See what messaging resonates. Understand why campaigns succeed or fail." },
              { role: "Policy Teams", icon: "□", desc: "Gauge public reaction in real time. Find gaps between statements and reality." },
            ].map((persona, i) => (
              <div key={i} className="bg-white p-8 hover:bg-stone-50 transition-colors group">
                <div className="text-4xl text-stone-200 group-hover:text-red-600 transition-colors mb-4 font-display">{persona.icon}</div>
                <h3 className="font-mono text-sm font-bold text-stone-900 mb-3 tracking-wider">{persona.role.toUpperCase()}</h3>
                <p className="font-body text-stone-600 leading-relaxed">{persona.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Status Board */}
      <section ref={statusRef} className="py-16 lg:py-24 bg-white grain">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={`grid lg:grid-cols-2 gap-12 items-start transition-all duration-700 ${statusVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Left - Header */}
            <div>
              <div className="text-[10px] font-mono text-stone-500 tracking-wider mb-4">SYSTEM STATUS</div>
              <h2 className="font-display text-4xl sm:text-5xl text-stone-900 leading-tight mb-6">
                Monitoring the
                <br />
                <span className="italic">entire</span> conversation
                <span className="text-red-600">.</span>
              </h2>
              <p className="font-body text-lg text-stone-600 leading-relaxed mb-8">
                Every platform. Every voice. Every shift in sentiment—captured in real-time
                and organized for immediate insight.
              </p>

              {/* Mini stats */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: "◉", label: "Real-time ingestion", desc: "Posts processed instantly" },
                  { icon: "◎", label: "Sentiment analysis", desc: "AI-powered classification" },
                  { icon: "◈", label: "Trend detection", desc: "Emerging topics surfaced" },
                  { icon: "◇", label: "Source verification", desc: "Credibility scoring" },
                ].map((item, i) => (
                  <div key={i} className="p-4 border border-stone-200 hover:border-stone-900 transition-colors group">
                    <div className="text-2xl text-stone-300 group-hover:text-red-600 transition-colors mb-2">{item.icon}</div>
                    <div className="font-mono text-xs font-bold text-stone-900 mb-1">{item.label}</div>
                    <div className="text-[10px] font-mono text-stone-500">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Status Board */}
            <div className="bg-white border-2 border-stone-900 shadow-[8px_8px_0px_0px_rgba(28,25,23,1)]">
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
              <div className="px-4 py-3 border-t border-stone-200 bg-stone-50">
                <div className="text-[10px] font-mono text-stone-500 text-center">
                  Last updated: {new Date().toLocaleTimeString()} • Auto-refresh: 30s
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Voice Stream Section */}
      <section ref={voicesRef} className="py-16 lg:py-24 bg-stone-50 grain">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={`transition-all duration-700 ${voicesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-stone-300">
              <div>
                <div className="text-[10px] font-mono text-stone-500 tracking-wider mb-2">VOICE STREAM</div>
                <h2 className="font-display text-4xl text-stone-900">
                  Real voices<span className="text-red-600">,</span> real time
                </h2>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-stone-500">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                <span>STREAMING {LIVE_VOICES.length} SOURCES</span>
              </div>
            </div>

            {/* Voice Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {LIVE_VOICES.map((voice, i) => (
                <VoiceCard key={i} voice={voice} delay={i * 100} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By - Editorial Style */}
      <section className="py-12 bg-white border-y border-stone-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="text-[10px] font-mono text-stone-500 tracking-wider">TRUSTED BY LEADING ORGANIZATIONS</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {COMPANY_LOGOS.map((company) => (
              <div key={company.name} className="relative h-8 flex items-center">
                <Image
                  src={company.src}
                  alt={company.name}
                  width={company.width}
                  height={company.height}
                  className="object-contain max-h-8 w-auto"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-20 lg:py-32 bg-stone-900 grain relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,255,255,0.1) 50px, rgba(255,255,255,0.1) 51px)`,
          }} />
        </div>

        <div className={`relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center transition-all duration-700 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-[10px] font-mono text-stone-500 tracking-wider mb-6">START TODAY</div>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-6">
            Stop guessing<span className="text-red-600">.</span>
            <br />
            <span className="italic">Start knowing</span><span className="text-red-600">.</span>
          </h2>
          <p className="font-body text-xl text-stone-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Join 2,000+ researchers, journalists, and strategists who track what America
            actually thinks—not what pundits say they think.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-10 py-5 font-mono text-sm font-bold text-stone-900 bg-white hover:bg-red-600 hover:text-white transition-all duration-300 tracking-wider group"
            >
              START FREE
              <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
          <p className="mt-8 text-[10px] font-mono text-stone-600">
            FREE TO START • NO CREDIT CARD REQUIRED • SETUP IN 2 MINUTES
          </p>
        </div>
      </section>

      {/* Footer - Editorial */}
      <footer className="bg-stone-100 border-t border-stone-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Logo Column */}
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-stone-900 flex items-center justify-center">
                  <span className="text-stone-100 font-mono text-xs font-bold">CV</span>
                </div>
                <span className="font-display text-xl text-stone-900">Civic Voices</span>
              </div>
              <p className="font-body text-stone-600 leading-relaxed mb-4">
                Real-time social intelligence for understanding what America thinks.
              </p>
              <div className="flex gap-4">
                {["X", "LinkedIn", "GitHub"].map((social) => (
                  <Link key={social} href="#" className="text-[10px] font-mono text-stone-500 hover:text-stone-900 transition-colors tracking-wider">
                    {social.toUpperCase()}
                  </Link>
                ))}
              </div>
            </div>

            {/* Link Columns */}
            {[
              { title: "Product", links: ["Features", "Pricing", "API", "Integrations"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security"] },
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
              © {new Date().getFullYear()} CIVIC VOICES. ALL RIGHTS RESERVED.
            </p>
            <p className="text-[10px] font-mono text-stone-400">
              TRACKING THE PULSE OF AMERICA
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
