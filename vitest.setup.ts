import "@testing-library/jest-dom/vitest";

/**
 * Mock ResizeObserver for tests using D3.js charts
 * D3 charts use ResizeObserver to handle responsive sizing
 */
class ResizeObserverMock implements Partial<ResizeObserver> {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

/**
 * Mock IntersectionObserver for animated components
 * Used by components that trigger animations when entering viewport
 */
class IntersectionObserverMock {
  private callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    this.triggerIntersection();
  }

  /**
   * Simulates element entering viewport immediately after observation
   */
  private triggerIntersection(): void {
    const mockEntry: IntersectionObserverEntry = {
      isIntersecting: true,
      target: document.body,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRatio: 1,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    };

    setTimeout(() => {
      this.callback([mockEntry], this as unknown as IntersectionObserver);
    }, 0);
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;

// Set test environment variables (all required by lib/config.ts)
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "test-nextauth-secret";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.REDDIT_CLIENT_ID = "test-reddit-client-id";
process.env.REDDIT_CLIENT_SECRET = "test-reddit-client-secret";
process.env.REDDIT_USER_AGENT = "test-reddit-user-agent";
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
process.env.X_BEARER_TOKEN = "test-x-bearer-token";
