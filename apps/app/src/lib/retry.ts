/**
 * Retry utilities with exponential backoff
 *
 * Provides reliable retry logic for network operations
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Whether to add jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** Function to determine if error is retryable (default: all errors) */
  isRetryable?: (error: unknown) => boolean;
  /** Callback called before each retry */
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "onRetry" | "isRetryable">> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Calculate delay for a given attempt with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  jitter: boolean
): number {
  // Exponential backoff: delay = initialDelay * multiplier^attempt
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter (0-30% of delay) to prevent thundering herd
  if (jitter) {
    const jitterAmount = cappedDelay * 0.3 * Math.random();
    return Math.floor(cappedDelay + jitterAmount);
  }

  return Math.floor(cappedDelay);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Default check for network errors that are worth retrying
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("timeout") ||
      message.includes("connection") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("etimedout")
    );
  }
  return false;
}

/**
 * Execute an async function with retry logic
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   async () => {
 *     const response = await fetch('/api/save');
 *     if (!response.ok) throw new Error('Save failed');
 *     return response.json();
 *   },
 *   {
 *     maxAttempts: 3,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Retry ${attempt} in ${delay}ms:`, error);
 *     },
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const { maxAttempts, initialDelay, maxDelay, backoffMultiplier, jitter } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const { isRetryable = () => true, onRetry } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const data = await fn();
      return { success: true, data, attempts: attempt + 1 };
    } catch (error) {
      lastError = error;

      // Check if this is the last attempt or error is not retryable
      const isLastAttempt = attempt === maxAttempts - 1;
      const shouldRetry = !isLastAttempt && isRetryable(error);

      if (!shouldRetry) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier, jitter);

      // Call retry callback if provided
      onRetry?.(attempt + 1, error, delay);

      await sleep(delay);
    }
  }

  return { success: false, error: lastError, attempts: maxAttempts };
}

/**
 * Create a retryable version of an async function
 *
 * @example
 * ```ts
 * const fetchWithRetry = createRetryableFunction(
 *   async (url: string) => {
 *     const response = await fetch(url);
 *     return response.json();
 *   },
 *   { maxAttempts: 3 }
 * );
 *
 * const data = await fetchWithRetry('/api/data');
 * ```
 */
export function createRetryableFunction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<RetryResult<TResult>> {
  return async (...args: TArgs) => {
    return withRetry(() => fn(...args), options);
  };
}
