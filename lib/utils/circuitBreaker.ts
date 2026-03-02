/**
 * Circuit Breaker pattern for resilient API integrations.
 * 
 * Prevents cascading failures by temporarily blocking requests to failing services.
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests fail fast without calling the service
 * - HALF_OPEN: Testing if service has recovered
 * 
 * Usage:
 * ```typescript
 * const redditBreaker = new CircuitBreaker({
 *   threshold: 3,        // Open after 3 failures
 *   timeout: 60000,      // Stay open for 1 minute
 *   name: 'Reddit API'
 * })
 * 
 * try {
 *   const result = await redditBreaker.execute(async () => {
 *     return await redditApi.search(query)
 *   })
 * } catch (error) {
 *   if (error.message.includes('Circuit breaker OPEN')) {
 *     // Handle gracefully - use cached data or skip this source
 *   }
 * }
 * ```
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening circuit */
  threshold?: number
  /** Time in milliseconds to wait before attempting recovery (default: 60000 = 1 minute) */
  timeout?: number
  /** Human-readable name for logging */
  name?: string
  /** Reset timeout multiplier for repeated failures (default: 1 = no backoff) */
  backoffMultiplier?: number
  /** Maximum timeout in milliseconds (default: 300000 = 5 minutes) */
  maxTimeout?: number
}

export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: CircuitState = 'CLOSED'
  private consecutiveOpenings = 0
  
  private threshold: number
  private timeout: number
  private name: string
  private backoffMultiplier: number
  private maxTimeout: number
  
  constructor(config: CircuitBreakerConfig = {}) {
    this.threshold = config.threshold ?? 5
    this.timeout = config.timeout ?? 60000 // 1 minute default
    this.name = config.name ?? 'default'
    this.backoffMultiplier = config.backoffMultiplier ?? 1
    this.maxTimeout = config.maxTimeout ?? 300000 // 5 minutes max
  }
  
  /**
   * Execute a function with circuit breaker protection.
   * 
   * @param fn - Async function to execute
   * @returns Result of the function
   * @throws CircuitBreakerOpenError if circuit is open
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      const currentTimeout = this.getCurrentTimeout()
      
      if (Date.now() - this.lastFailureTime > currentTimeout) {
        console.log(`[Circuit Breaker] ${this.name} transitioning to HALF_OPEN (timeout: ${currentTimeout}ms)`)
        this.state = 'HALF_OPEN'
      } else {
        const remainingMs = currentTimeout - (Date.now() - this.lastFailureTime)
        throw new CircuitBreakerOpenError(
          `Circuit breaker OPEN for ${this.name} (${Math.ceil(remainingMs / 1000)}s remaining)`,
          this.name,
          remainingMs
        )
      }
    }
    
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  /**
   * Get current timeout with exponential backoff
   */
  private getCurrentTimeout(): number {
    if (this.backoffMultiplier === 1) return this.timeout
    
    const backoffTimeout = this.timeout * Math.pow(this.backoffMultiplier, this.consecutiveOpenings)
    return Math.min(backoffTimeout, this.maxTimeout)
  }
  
  /**
   * Handle successful execution
   */
  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      console.log(`[Circuit Breaker] ${this.name} recovered, transitioning to CLOSED`)
    }
    
    this.failures = 0
    this.consecutiveOpenings = 0
    this.state = 'CLOSED'
  }
  
  /**
   * Handle failed execution
   */
  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.threshold) {
      if (this.state !== 'OPEN') {
        this.consecutiveOpenings++
      }
      
      this.state = 'OPEN'
      const currentTimeout = this.getCurrentTimeout()
      console.warn(
        `[Circuit Breaker] ${this.name} OPENED after ${this.failures} failures ` +
        `(timeout: ${currentTimeout}ms, consecutive openings: ${this.consecutiveOpenings})`
      )
    }
  }
  
  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state
  }
  
  /**
   * Get failure count
   */
  getFailures(): number {
    return this.failures
  }
  
  /**
   * Manually reset the circuit breaker
   */
  reset() {
    this.failures = 0
    this.consecutiveOpenings = 0
    this.state = 'CLOSED'
    console.log(`[Circuit Breaker] ${this.name} manually reset`)
  }
  
  /**
   * Get status info for monitoring
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      consecutiveOpenings: this.consecutiveOpenings,
      currentTimeout: this.getCurrentTimeout(),
      lastFailureTime: this.lastFailureTime,
    }
  }
}

/**
 * Custom error for when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(
    message: string,
    public readonly breakerName: string,
    public readonly remainingMs: number
  ) {
    super(message)
    this.name = 'CircuitBreakerOpenError'
  }
}

/**
 * Global circuit breakers for social media APIs.
 * Shared across all requests to track per-service health.
 */
export const circuitBreakers = {
  reddit: new CircuitBreaker({
    threshold: 3,
    timeout: 300000, // 5 minutes (Reddit has 100 req/min limit)
    name: 'Reddit API',
    backoffMultiplier: 1.5,
    maxTimeout: 900000, // 15 minutes max
  }),
  
  x_rapidapi: new CircuitBreaker({
    threshold: 5,
    timeout: 60000, // 1 minute
    name: 'X RapidAPI',
    backoffMultiplier: 2,
    maxTimeout: 600000, // 10 minutes max
  }),
  
  x_official: new CircuitBreaker({
    threshold: 3,
    timeout: 900000, // 15 minutes (official API has strict limits)
    name: 'X Official API',
    backoffMultiplier: 2,
    maxTimeout: 3600000, // 1 hour max
  }),
  
  tiktok_sociavault: new CircuitBreaker({
    threshold: 5,
    timeout: 120000, // 2 minutes
    name: 'TikTok SociaVault',
    backoffMultiplier: 1.5,
    maxTimeout: 600000, // 10 minutes max
  }),
  
  tiktok_tikapi: new CircuitBreaker({
    threshold: 5,
    timeout: 120000, // 2 minutes
    name: 'TikTok TikAPI',
    backoffMultiplier: 1.5,
    maxTimeout: 600000, // 10 minutes max
  }),
  
  youtube: new CircuitBreaker({
    threshold: 3,
    timeout: 300000, // 5 minutes (quota system)
    name: 'YouTube API',
    backoffMultiplier: 2,
    maxTimeout: 3600000, // 1 hour max (quota resets daily)
  }),
  
  bluesky: new CircuitBreaker({
    threshold: 5,
    timeout: 60000, // 1 minute
    name: 'Bluesky API',
    backoffMultiplier: 1.5,
    maxTimeout: 300000, // 5 minutes max
  }),
  
  truthsocial: new CircuitBreaker({
    threshold: 5,
    timeout: 60000, // 1 minute
    name: 'Truth Social API',
    backoffMultiplier: 1.5,
    maxTimeout: 300000, // 5 minutes max
  }),
}

/**
 * Get status of all circuit breakers (for monitoring/debugging)
 */
export function getAllCircuitBreakerStatus() {
  return Object.entries(circuitBreakers).map(([key, breaker]) => ({
    key,
    ...breaker.getStatus(),
  }))
}
