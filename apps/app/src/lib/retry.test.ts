/**
 * Tests for retry utility
 */

import { withRetry, isNetworkError, createRetryableFunction } from "./retry";

describe("retry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("isNetworkError", () => {
    it("should return true for network-related errors", () => {
      expect(isNetworkError(new Error("Network error"))).toBe(true);
      expect(isNetworkError(new Error("fetch failed"))).toBe(true);
      expect(isNetworkError(new Error("Connection refused"))).toBe(true);
      expect(isNetworkError(new Error("ECONNREFUSED"))).toBe(true);
      expect(isNetworkError(new Error("ETIMEDOUT"))).toBe(true);
      expect(isNetworkError(new Error("Request timeout"))).toBe(true);
    });

    it("should return false for non-network errors", () => {
      expect(isNetworkError(new Error("Invalid input"))).toBe(false);
      expect(isNetworkError(new Error("Not found"))).toBe(false);
      expect(isNetworkError(new Error("Unauthorized"))).toBe(false);
      expect(isNetworkError("string error")).toBe(false);
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });
  });

  describe("withRetry", () => {
    it("should return success on first attempt if function succeeds", async () => {
      const fn = jest.fn().mockResolvedValue("success");

      const result = await withRetry(fn);

      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and succeed on second attempt", async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error("First failure"))
        .mockResolvedValueOnce("success");

      const resultPromise = withRetry(fn, { initialDelay: 100, jitter: false });

      // Fast-forward through the delay
      await jest.advanceTimersByTimeAsync(100);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(result.attempts).toBe(2);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should fail after max attempts", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("Always fails"));

      const resultPromise = withRetry(fn, {
        maxAttempts: 3,
        initialDelay: 100,
        jitter: false,
      });

      // Fast-forward through all retries
      await jest.advanceTimersByTimeAsync(100); // First retry delay
      await jest.advanceTimersByTimeAsync(200); // Second retry delay (exponential)

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe("Always fails");
      expect(result.attempts).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should not retry if isRetryable returns false", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("Not retryable"));

      const result = await withRetry(fn, {
        maxAttempts: 3,
        isRetryable: () => false,
      });

      expect(result.success).toBe(false);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("createRetryableFunction", () => {
    it("should create a function that retries", async () => {
      const originalFn = jest
        .fn()
        .mockRejectedValueOnce(new Error("Fail"))
        .mockResolvedValueOnce("success");

      const retryableFn = createRetryableFunction(originalFn, {
        maxAttempts: 2,
        initialDelay: 100,
        jitter: false,
      });

      const resultPromise = retryableFn("arg1", "arg2");

      await jest.advanceTimersByTimeAsync(100);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.data).toBe("success");
      expect(originalFn).toHaveBeenCalledWith("arg1", "arg2");
      expect(originalFn).toHaveBeenCalledTimes(2);
    });
  });
});
