"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";

// Custom hook for scroll-triggered animations
function useScrollAnimation(options: { threshold?: number; rootMargin?: string } = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: options.threshold ?? 0.1, rootMargin: options.rootMargin ?? "0px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]);

  return { ref, isVisible };
}

// Custom hook for parallax scroll effect
function useParallax(speed: number = 0.5) {
  const [offset, setOffset] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const scrolled = window.innerHeight - rect.top;
    if (scrolled > 0) {
      setOffset(scrolled * speed * 0.1);
    }
  }, [speed]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return { ref, offset };
}

// Animated section wrapper component
function AnimatedSection({
  children,
  className = "",
  delay = 0,
  direction = "up"
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
}) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const directionClasses = {
    up: "translate-y-12",
    down: "-translate-y-12",
    left: "translate-x-12",
    right: "-translate-x-12",
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translate(0, 0)" : undefined,
      }}
    >
      <div className={`${!isVisible ? directionClasses[direction] : ""} transition-transform duration-700 ease-out`} style={{ transitionDelay: `${delay}ms` }}>
        {children}
      </div>
    </div>
  );
}

// Staggered children animation wrapper
function StaggeredContainer({
  children,
  className = "",
  staggerDelay = 100
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <div
              key={i}
              className="transition-all duration-500 ease-out"
              style={{
                transitionDelay: `${i * staggerDelay}ms`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(20px)",
              }}
            >
              {child}
            </div>
          ))
        : children
      }
    </div>
  );
}

// Company logos data
const COMPANY_LOGOS = [
  { name: "Google", src: "/logos/Google_2015_logo.png", width: 100, height: 34 },
  { name: "Microsoft", src: "/logos/Microsoft-Logo.png", width: 120, height: 26 },
  { name: "Amazon", src: "/logos/amazon-logo-transparent.png", width: 100, height: 30 },
  { name: "TikTok", src: "/logos/TikTok_logo.png", width: 100, height: 29 },
  { name: "NC IDEA", src: "/logos/NC-IDEA-logo.png", width: 90, height: 40 },
  { name: "Washington Post", src: "/logos/the-washington-post-logo-svg-vector.svg", width: 140, height: 22 },
  { name: "Bank of America", src: "/logos/bank-of-america-logo.png", width: 140, height: 28 },
  { name: "Truist", src: "/logos/truist-logo.png", width: 100, height: 28 },
];

const SIGNAL_WORDS = ["Opinions", "Narratives", "Shifts", "Movements", "Sentiment"];

// Social media platform icons
const PlatformIcons: Record<string, React.ReactNode> = {
  x: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  ),
  reddit: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  meta: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a4.892 4.892 0 0 0 1.227 2.27c.532.56 1.175.874 1.89.874 1.089 0 2.073-.504 3.212-1.618.896-.876 1.9-2.084 2.994-3.636l1.786-2.535c.076-.106.2-.106.276 0l1.786 2.535c1.094 1.552 2.098 2.76 2.994 3.636 1.14 1.114 2.123 1.618 3.212 1.618.715 0 1.358-.315 1.89-.873a4.892 4.892 0 0 0 1.227-2.27c.14-.605.21-1.268.21-1.974 0-2.566-.704-5.24-2.044-7.306-1.188-1.833-2.903-3.113-4.871-3.113-1.252 0-2.407.505-3.636 1.618-.74.67-1.5 1.543-2.3 2.632l-.272.372a.096.096 0 0 1-.153 0l-.272-.372c-.8-1.089-1.56-1.962-2.3-2.632-1.23-1.113-2.384-1.618-3.636-1.618z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  threads: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.333-3.022.812-.672 1.927-1.084 3.227-1.191.932-.077 1.865-.035 2.785.124-.09-.478-.272-.884-.549-1.212-.509-.603-1.327-.917-2.435-.935l-.018-.002c-.893 0-1.683.297-2.283.858l-1.33-1.555c.903-.772 2.07-1.192 3.605-1.228l.028-.001c1.656.029 2.94.553 3.816 1.558.735.843 1.152 1.95 1.24 3.294.34.108.668.233.98.374 1.143.516 2.07 1.272 2.68 2.186.728 1.09 1.023 2.383.877 3.842-.213 2.125-1.196 3.884-2.925 5.234C17.681 23.296 15.218 24.022 12.186 24zm.066-9.418c-.893.06-1.586.28-2.003.635-.322.274-.472.597-.446.96.024.344.196.631.514.853.394.274.936.412 1.615.412l.143-.003c1.015-.054 1.782-.396 2.28-1.016.378-.47.602-1.076.67-1.816-.902-.157-1.818-.18-2.773-.025z" />
    </svg>
  ),
  bluesky: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z" />
    </svg>
  ),
  mastodon: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z" />
    </svg>
  ),
};

// Social media platform cards data
const SOCIAL_PLATFORMS = [
  { name: "X (Twitter)", type: "Trend Analysis", icon: "x", color: "bg-black", value: "124K" },
  { name: "TikTok", type: "Video Sentiment", icon: "tiktok", color: "bg-black", value: "89K" },
  { name: "Reddit", type: "Community Insights", icon: "reddit", color: "bg-orange-500", value: "156K" },
  { name: "YouTube", type: "Comment Mining", icon: "youtube", color: "bg-red-600", value: "203K" },
  { name: "Meta", type: "Social Tracking", icon: "meta", color: "bg-blue-600", value: "178K" },
  { name: "Instagram", type: "Hashtag Analysis", icon: "instagram", color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400", value: "145K" },
  { name: "LinkedIn", type: "Professional Pulse", icon: "linkedin", color: "bg-blue-700", value: "67K" },
  { name: "Threads", type: "Conversation Mapping", icon: "threads", color: "bg-black", value: "52K" },
  { name: "Bluesky", type: "Emerging Voices", icon: "bluesky", color: "bg-sky-500", value: "34K" },
  { name: "Mastodon", type: "Decentralized Intel", icon: "mastodon", color: "bg-indigo-600", value: "28K" },
];

export default function Home() {
  const [currentWord, setCurrentWord] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const { ref: parallaxRef, offset: parallaxOffset } = useParallax(0.3);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % SIGNAL_WORDS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                <span className="text-white font-bold text-sm">CV</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">Civic Voices</span>
            </div>

            {/* Nav Actions */}
            <div className="flex items-center gap-4">
              <Link
                href="/search?auth=true"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/search"
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-600">Live Social Intelligence</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
              Track the{" "}
              <span className="relative inline-block">
                <span className="text-gray-900 border-b-4 border-gray-900">
                  {SIGNAL_WORDS[currentWord]}
                </span>
              </span>
              <br />
              that shape America
            </h1>

            {/* Subhead */}
            <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              Real-time intelligence from X, TikTok, Reddit, and beyond.
              See what people actually think before it becomes news.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/search"
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium rounded-lg bg-black text-white hover:bg-gray-800 transition-colors"
              >
                Try it free
                <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-6 mt-12 pt-8 border-t border-gray-100">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
                ))}
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">2,000+</span> researchers trust us
              </div>
            </div>

            {/* Trusted By Logos */}
            <div className="mt-16">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center mb-8">
                Trusted by leading organizations
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                {COMPANY_LOGOS.slice(0, 6).map((company) => (
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
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="pb-20 lg:pb-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div
            ref={parallaxRef}
            className={`relative transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            style={{ transform: `translateY(${-parallaxOffset}px)` }}
          >
            {/* Browser Frame */}
            <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
              {/* Browser Bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-400 max-w-md mx-auto">
                    civicvoices.ai/search
                  </div>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-6 bg-gray-50">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  {/* Search Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Live Analysis</div>
                      <div className="text-lg font-semibold text-gray-900">&quot;climate change policy&quot;</div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-medium text-green-700">Live</span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: "Posts Analyzed", value: "24.8K" },
                      { label: "Sentiment", value: "+12%" },
                      { label: "Trending", value: "#3" },
                    ].map((stat, i) => (
                      <div key={i} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
                        <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mini Chart */}
                  <div className="h-32 rounded-lg bg-gray-50 border border-gray-100 flex items-end justify-around p-4">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95].map((h, i) => (
                      <div
                        key={i}
                        className="w-4 rounded-t bg-gray-900"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>

                  {/* Platform Tags */}
                  <div className="flex flex-wrap gap-2 mt-6">
                    {["X", "TikTok", "Reddit", "YouTube"].map((p) => (
                      <span key={p} className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media Platforms Scroll */}
      <section className="py-16 overflow-hidden">
        <AnimatedSection className="mx-auto max-w-7xl px-6 lg:px-8 mb-8">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider text-center">
            Platforms We Monitor
          </p>
        </AnimatedSection>
        <div className="relative">
          {/* Gradient overlays for scroll effect */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          {/* Scrolling container */}
          <div className="flex gap-6 overflow-x-auto pb-4 px-6 scrollbar-hide snap-x snap-mandatory scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {SOCIAL_PLATFORMS.map((platform, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-72 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 snap-center"
              >
                {/* Header with logo and name */}
                <div className="flex items-center gap-4 mb-5">
                  <div className={`w-12 h-12 rounded-xl ${platform.color} flex items-center justify-center shadow-md text-white`}>
                    {PlatformIcons[platform.icon]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                    <p className="text-sm text-gray-500">{platform.type}</p>
                  </div>
                </div>

                {/* Placeholder content lines */}
                <div className="space-y-2.5 mb-5">
                  <div className="h-2.5 bg-gray-100 rounded-full w-full" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-4/5" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-3/5" />
                </div>

                {/* Stats footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-400">Posts Analyzed</span>
                  <span className="text-lg font-bold text-green-600">{platform.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extended Logo Bar */}
      <section className="py-12 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {COMPANY_LOGOS.map((company) => (
              <div key={company.name} className="relative h-7 flex items-center">
                <Image
                  src={company.src}
                  alt={company.name}
                  width={company.width}
                  height={company.height}
                  className="object-contain max-h-7 w-auto"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {/* Section Header */}
          <AnimatedSection className="text-center mb-16">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              From question to insight in <span className="text-gray-400">seconds</span>
            </h2>
          </AnimatedSection>

          {/* Steps */}
          <StaggeredContainer className="grid md:grid-cols-3 gap-8" staggerDelay={150}>
            {[
              {
                step: "01",
                title: "Ask anything",
                description: "Type a topic, paste a link, or describe what you want to track. Our AI understands context.",
              },
              {
                step: "02",
                title: "We scan everything",
                description: "Real-time analysis across X, TikTok, Reddit, YouTube, Instagram, and forums simultaneously.",
              },
              {
                step: "03",
                title: "Get actionable insights",
                description: "Sentiment trends, key themes, influential voices, and emerging narratives—all in one view.",
              },
            ].map((step, i) => (
              <div key={i} className="relative group">
                <div className="p-8 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="text-5xl font-bold text-gray-100 mb-4">{step.step}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </StaggeredContainer>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-20 lg:py-32 bg-gray-900 text-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <AnimatedSection className="max-w-3xl mb-16">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">What you get</p>
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
              Civic Voices lets you
            </h2>
            <p className="text-lg text-gray-400">
              Designed for people who need signal, not noise.
            </p>
          </AnimatedSection>

          <StaggeredContainer className="grid md:grid-cols-2 gap-6" staggerDelay={100}>
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
                title: "Surface unmet needs and pain points",
                description: "Discover what people actually care about from how they talk online—not what surveys say they should.",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                ),
                title: "Map social narratives",
                description: "Understand the framing, sentiment, and momentum behind any topic across platforms.",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
                title: "Explore synthetic conversations",
                description: "Test assumptions and viewpoints with AI-powered dialogue simulations before committing to strategy.",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
                title: "Track emerging topics early",
                description: "Spot trends before they show up in reports or polls. Be first to understand what's shifting.",
              },
            ].map((item, i) => (
              <div key={i} className="group p-6 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800 hover:border-gray-600 transition-all duration-300">
                <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center mb-4 text-gray-300 group-hover:bg-white group-hover:text-gray-900 transition-all duration-300">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </StaggeredContainer>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 lg:py-32 bg-gray-50 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <AnimatedSection direction="left">
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Who it&apos;s for</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 leading-tight">
                Built for those who need to understand America
              </h2>

              <StaggeredContainer className="space-y-4" staggerDelay={100}>
                {[
                  { role: "Journalists", need: "Find emerging stories before they break. Verify what people are actually saying." },
                  { role: "Researchers", need: "Track opinion formation across platforms. Export data for deeper analysis." },
                  { role: "Marketing Teams", need: "See what messaging resonates. Understand why campaigns fail or succeed." },
                  { role: "Policy Teams", need: "Gauge public reaction in real time. Find gaps between statements and reality." },
                ].map((persona, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer hover:-translate-x-1">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">{["📰", "🔬", "📈", "🏛️"][i]}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{persona.role}</h3>
                      <p className="text-sm text-gray-500">{persona.need}</p>
                    </div>
                  </div>
                ))}
              </StaggeredContainer>
            </AnimatedSection>

            {/* Right: Testimonial */}
            <AnimatedSection direction="right" delay={200}>
              <div className="bg-white rounded-2xl p-10 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-500">
                <svg className="w-10 h-10 text-gray-200 mb-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <blockquote className="text-xl text-gray-900 leading-relaxed mb-8">
                  We track how narratives form on TikTok and spread to X. The pattern recognition across platforms{" "}
                  <span className="font-semibold">changed how we report.</span>
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200" />
                  <div>
                    <div className="font-semibold text-gray-900">Alex Rivera</div>
                    <div className="text-sm text-gray-500">Investigative Reporter, National Newsroom</div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Sample Insights */}
      <section className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Insights you can&apos;t get anywhere else
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Real examples of what our users discover every day
            </p>
          </AnimatedSection>

          {/* Insights Grid */}
          <StaggeredContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={80}>
            {[
              { insight: "Housing affordability concerns increased 34% on Reddit this month", platform: "Reddit", metric: "12.4K posts", trending: true },
              { insight: "EV skepticism grew among truck owners on X and YouTube", platform: "X + YouTube", metric: "8.9K mentions", trending: false },
              { insight: "Gen Z shifted from concern to ridicule on climate messaging", platform: "TikTok", metric: "15.2K videos", trending: true },
              { insight: "Return-to-office resistance peaked in tech forums", platform: "Forums", metric: "6.7K threads", trending: false },
              { insight: "Small business owners distrust economic optimism narratives", platform: "YouTube", metric: "9.3K comments", trending: false },
              { insight: "AI concerns split by age: tools vs. threats framing", platform: "All Platforms", metric: "28K discussions", trending: true },
            ].map((item, i) => (
              <div key={i} className="group p-6 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                {item.trending && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-gray-600">Trending</span>
                  </div>
                )}
                <h3 className="text-base font-medium text-gray-900 mb-4 leading-snug group-hover:text-gray-700">
                  {item.insight}
                </h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{item.platform}</span>
                  <span className="text-gray-900 font-medium">{item.metric}</span>
                </div>
              </div>
            ))}
          </StaggeredContainer>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-32 bg-gray-900 overflow-hidden">
        <AnimatedSection className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Start understanding what America really thinks
          </h2>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
            Free to try. No credit card required. Set up in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-lg bg-white text-gray-900 hover:bg-gray-100 hover:scale-105 transition-all duration-300"
            >
              Try Civic Voices free
              <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <button className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-lg border border-gray-700 text-white hover:bg-gray-800 hover:scale-105 transition-all duration-300">
              Schedule a demo
            </button>
          </div>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CV</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">Civic Voices</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Real-time social intelligence for understanding what America thinks.
              </p>
            </div>
            {[
              { title: "Product", links: ["Features", "Pricing", "API", "Integrations"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
            ].map((group, i) => (
              <div key={i}>
                <h4 className="font-semibold text-gray-900 mb-4">{group.title}</h4>
                <ul className="space-y-3">
                  {group.links.map((link) => (
                    <li key={link}>
                      <Link href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">&copy; 2025 Civic Voices. All rights reserved.</p>
            <div className="flex items-center gap-6">
              {["Twitter", "LinkedIn", "GitHub"].map((social) => (
                <Link key={social} href="#" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">
                  {social}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
