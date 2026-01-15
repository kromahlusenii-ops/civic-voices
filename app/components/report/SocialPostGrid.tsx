"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Post } from "@/lib/types/api";
import SocialPostCard from "./SocialPostCard";

export interface SocialPostGridProps {
  posts: Array<Post & { sentiment: "positive" | "negative" | "neutral" | null }>;
}

export default function SocialPostGrid({ posts }: SocialPostGridProps) {
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const cardRefs = useRef<Map<number, HTMLAnchorElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Callback ref to register each card
  const setCardRef = useCallback((index: number, el: HTMLAnchorElement | null) => {
    if (el) {
      cardRefs.current.set(index, el);
    } else {
      cardRefs.current.delete(index);
    }
  }, []);

  // Set up Intersection Observer for parallax animation
  useEffect(() => {
    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute("data-index") || "0", 10);
          if (entry.isIntersecting) {
            setVisibleCards((prev) => new Set([...prev, index]));
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "50px 0px",
      }
    );

    // Observe all cards
    cardRefs.current.forEach((el, index) => {
      el.setAttribute("data-index", index.toString());
      observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [posts.length]);

  // Re-observe when posts change
  useEffect(() => {
    const observer = observerRef.current;
    if (!observer) return;

    // Disconnect and reconnect to handle new cards
    observer.disconnect();
    cardRefs.current.forEach((el, index) => {
      el.setAttribute("data-index", index.toString());
      observer.observe(el);
    });
  }, [posts]);

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <svg
          className="w-12 h-12 mx-auto mb-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <p>No posts to display</p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
      data-testid="social-post-grid"
    >
      {posts.map((post, index) => (
        <SocialPostCard
          key={post.id}
          ref={(el) => setCardRef(index, el)}
          post={post}
          index={index}
          isVisible={visibleCards.has(index)}
        />
      ))}
    </div>
  );
}
