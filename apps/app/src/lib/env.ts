/**
 * Environment utilities
 *
 * Helper functions for checking environment and conditionally running code.
 */

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Check if running in production mode
 */
export function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === "test";
}

/**
 * Log only in development mode
 */
export function devLog(...args: unknown[]): void {
  if (isDev()) {
    console.log(...args);
  }
}

/**
 * Warn only in development mode
 */
export function devWarn(...args: unknown[]): void {
  if (isDev()) {
    console.warn(...args);
  }
}

/**
 * Error log (always logs, but with dev prefix in development)
 */
export function devError(...args: unknown[]): void {
  if (isDev()) {
    console.error("[DEV]", ...args);
  } else {
    console.error(...args);
  }
}
