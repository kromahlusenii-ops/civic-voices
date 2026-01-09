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

  // X (Twitter) API
  x: {
    bearerToken?: string;
  };

  // TikTok API
  tiktok: {
    apiKey?: string;
    apiUrl?: string;
  };

  // Future providers (placeholders)
  providers: {
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
 * Sanitizes the X bearer token by:
 * 1. Removing surrounding quotes (if copied with quotes)
 * 2. URL decoding (if copied with encoding)
 */
function sanitizeXBearerToken(token: string | undefined): string | undefined {
  if (!token) {
    return undefined;
  }

  // Remove surrounding quotes if present
  const unquotedToken = token.replace(/^["']|["']$/g, '');

  // URL decode in case it was copied with encoding
  return decodeURIComponent(unquotedToken);
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

    x: {
      bearerToken: sanitizeXBearerToken(getOptionalEnv('X_BEARER_TOKEN')),
    },

    tiktok: {
      apiKey: getOptionalEnv('TIKTOK_API_KEY'),
      apiUrl: getOptionalEnv('TIKTOK_API_URL'),
    },

    providers: {
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
