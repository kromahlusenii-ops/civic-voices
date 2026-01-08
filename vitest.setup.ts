import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver for tests using D3.js charts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

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
