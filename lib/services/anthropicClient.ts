const DEFAULT_MIN_DELAY_MS = Number(process.env.ANTHROPIC_MIN_DELAY_MS ?? "1200");
const DEFAULT_MAX_RETRIES = Number(process.env.ANTHROPIC_MAX_RETRIES ?? "3");

let lastRequestTimeMs = 0;
let rateLimitQueue: Promise<unknown> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number.parseInt(value, 10);
  if (!Number.isNaN(seconds)) {
    return seconds * 1000;
  }
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return null;
}

async function scheduleRateLimited<T>(fn: () => Promise<T>): Promise<T> {
  const run = async () => {
    const now = Date.now();
    const waitMs = Math.max(0, DEFAULT_MIN_DELAY_MS - (now - lastRequestTimeMs));
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    lastRequestTimeMs = Date.now();
    return fn();
  };

  rateLimitQueue = rateLimitQueue.then(run, run);
  return rateLimitQueue as Promise<T>;
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let attempt = 0;

  while (true) {
    const response = await fetch(url, init);
    if (response.ok) return response;

    if (response.status !== 429 && response.status !== 529) {
      return response;
    }

    if (attempt >= DEFAULT_MAX_RETRIES) {
      return response;
    }

    const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
    const backoffMs = Math.min(10000, 1000 * Math.pow(2, attempt));
    const waitMs = retryAfterMs ?? backoffMs;
    attempt += 1;
    await sleep(waitMs);
  }
}

export async function anthropicFetch(
  url: string,
  init: RequestInit
): Promise<Response> {
  return scheduleRateLimited(() => fetchWithRetry(url, init));
}
