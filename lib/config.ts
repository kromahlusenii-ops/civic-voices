/**
 * Centralized configuration module
 * All environment variables MUST be read from this file only.
 * No other file should access process.env directly.
 */

interface Config {
  // Database
  database: {
    url: string;
  };

  // Authentication
  auth: {
    nextAuthUrl: string;
    nextAuthSecret: string;
  };

  // Supabase
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };

  // Reddit API
  reddit: {
    clientId: string;
    clientSecret: string;
    userAgent: string;
  };

  // LLM Providers
  llm: {
    openai: {
      apiKey: string;
    };
    anthropic: {
      apiKey: string;
    };
  };

  // Future providers (placeholders)
  providers: {
    twitter?: {
      apiKey?: string;
      apiSecret?: string;
    };
    tiktok?: {
      apiKey?: string;
    };
    linkedin?: {
      apiKey?: string;
    };
    youtube?: {
      apiKey?: string;
    };
  };
}

/**
 * Validates and returns a required environment variable
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Returns an optional environment variable
 */
function getOptionalEnv(key: string): string | undefined {
  return process.env[key];
}

/**
 * Validates and constructs the configuration object
 */
function loadConfig(): Config {
  return {
    database: {
      url: getRequiredEnv('DATABASE_URL'),
    },

    auth: {
      nextAuthUrl: getRequiredEnv('NEXTAUTH_URL'),
      nextAuthSecret: getRequiredEnv('NEXTAUTH_SECRET'),
    },

    supabase: {
      url: getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      anonKey: getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      serviceRoleKey: getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    },

    reddit: {
      clientId: getRequiredEnv('REDDIT_CLIENT_ID'),
      clientSecret: getRequiredEnv('REDDIT_CLIENT_SECRET'),
      userAgent: getRequiredEnv('REDDIT_USER_AGENT'),
    },

    llm: {
      openai: {
        apiKey: getRequiredEnv('OPENAI_API_KEY'),
      },
      anthropic: {
        apiKey: getRequiredEnv('ANTHROPIC_API_KEY'),
      },
    },

    providers: {
      twitter: {
        apiKey: getOptionalEnv('TWITTER_API_KEY'),
        apiSecret: getOptionalEnv('TWITTER_API_SECRET'),
      },
      tiktok: {
        apiKey: getOptionalEnv('TIKTOK_API_KEY'),
      },
      linkedin: {
        apiKey: getOptionalEnv('LINKEDIN_API_KEY'),
      },
      youtube: {
        apiKey: getOptionalEnv('YOUTUBE_API_KEY'),
      },
    },
  };
}

// Export the singleton config instance
export const config = loadConfig();
