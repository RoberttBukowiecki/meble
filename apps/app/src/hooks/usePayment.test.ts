/**
 * Payment Hook Tests
 *
 * Tests for payment creation flow.
 * Handles both authenticated and guest user purchases.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { usePayment } from "./usePayment";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Supabase client - the hook uses this to get auth session
const mockGetSession = jest.fn();
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}));

// Mock window.location
const mockLocation = {
  origin: "http://localhost:3000",
};

Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

// Silence console.error for expected errors
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe("usePayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Default: authenticated user with access token
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-access-token",
        },
      },
    });
  });

  describe("createPayment", () => {
    it("creates payment for authenticated user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            redirectUrl: "https://payu.com/pay/123",
            paymentId: "payment-123",
          },
        }),
      });

      const { result } = renderHook(() => usePayment());

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.createPayment({
          packageType: "standard",
          provider: "payu",
          email: "user@example.com",
        });
      });

      expect(paymentResult).toEqual({
        success: true,
        redirectUrl: "https://payu.com/pay/123",
        paymentId: "payment-123",
      });

      // Verify fetch was called with correct params
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/payments/create"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          }),
          body: expect.stringContaining('"packageId":"standard"'),
        })
      );

      // Verify no x-session-id header for authenticated user
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers["x-session-id"]).toBeUndefined();
    });

    it("creates payment for guest with x-session-id header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            redirectUrl: "https://payu.com/pay/456",
            paymentId: "payment-456",
          },
        }),
      });

      const { result } = renderHook(() => usePayment());

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.createPayment({
          packageType: "single",
          provider: "payu",
          email: "guest@example.com",
          sessionId: "guest_abc123_xyz789",
        });
      });

      expect(paymentResult).toEqual({
        success: true,
        redirectUrl: "https://payu.com/pay/456",
        paymentId: "payment-456",
      });

      // Verify x-session-id header was included
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers["x-session-id"]).toBe("guest_abc123_xyz789");
    });

    it("returns redirect URL and payment ID on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            redirectUrl: "https://payu.com/checkout/abc",
            paymentId: "pay_xyz",
          },
        }),
      });

      const { result } = renderHook(() => usePayment());

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.createPayment({
          packageType: "pro",
          provider: "payu",
          email: "pro@example.com",
        });
      });

      expect(paymentResult?.success).toBe(true);
      expect(paymentResult?.redirectUrl).toBe("https://payu.com/checkout/abc");
      expect(paymentResult?.paymentId).toBe("pay_xyz");
    });

    it("handles API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            message: "Invalid package type",
          },
        }),
      });

      const { result } = renderHook(() => usePayment());

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.createPayment({
          packageType: "invalid" as any,
          provider: "payu",
          email: "test@example.com",
        });
      });

      expect(paymentResult).toEqual({
        success: false,
        error: "Invalid package type",
      });

      // Error should be set in hook state
      expect(result.current.error).toBe("Invalid package type");
    });

    it("handles API error with default message when no message provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {},
        }),
      });

      const { result } = renderHook(() => usePayment());

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.createPayment({
          packageType: "standard",
          provider: "payu",
          email: "test@example.com",
        });
      });

      expect(paymentResult?.success).toBe(false);
      expect(paymentResult?.error).toBe("Blad tworzenia platnosci");
    });

    it("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network unavailable"));

      const { result } = renderHook(() => usePayment());

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.createPayment({
          packageType: "starter",
          provider: "payu",
          email: "test@example.com",
        });
      });

      expect(paymentResult).toEqual({
        success: false,
        error: "Network unavailable",
      });

      expect(result.current.error).toBe("Network unavailable");
    });

    it("handles non-Error thrown exceptions", async () => {
      mockFetch.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => usePayment());

      let paymentResult;
      await act(async () => {
        paymentResult = await result.current.createPayment({
          packageType: "starter",
          provider: "payu",
          email: "test@example.com",
        });
      });

      expect(paymentResult?.success).toBe(false);
      expect(paymentResult?.error).toBe("Nieznany blad");
    });

    it("sets isCreating to true during request", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(() => usePayment());

      // Start the payment creation
      let paymentPromise: Promise<any>;
      act(() => {
        paymentPromise = result.current.createPayment({
          packageType: "standard",
          provider: "payu",
          email: "test@example.com",
        });
      });

      // Check isCreating is true during request
      expect(result.current.isCreating).toBe(true);

      // Resolve the request
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({
            success: true,
            data: { redirectUrl: "https://payu.com", paymentId: "123" },
          }),
        });
        await paymentPromise;
      });

      // isCreating should be false after completion
      expect(result.current.isCreating).toBe(false);
    });

    it("sets isCreating to false after request completes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { redirectUrl: "https://payu.com", paymentId: "123" },
        }),
      });

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        await result.current.createPayment({
          packageType: "standard",
          provider: "payu",
          email: "test@example.com",
        });
      });

      expect(result.current.isCreating).toBe(false);
    });

    it("sets isCreating to false after error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Failed"));

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        await result.current.createPayment({
          packageType: "standard",
          provider: "payu",
          email: "test@example.com",
        });
      });

      expect(result.current.isCreating).toBe(false);
    });

    it("sets error state on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: "Payment failed" },
        }),
      });

      const { result } = renderHook(() => usePayment());

      expect(result.current.error).toBeNull();

      await act(async () => {
        await result.current.createPayment({
          packageType: "standard",
          provider: "payu",
          email: "test@example.com",
        });
      });

      expect(result.current.error).toBe("Payment failed");
    });

    it("clears error state on new request", async () => {
      // First request fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: "First error" },
        }),
      });

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        await result.current.createPayment({
          packageType: "standard",
          provider: "payu",
          email: "test@example.com",
        });
      });

      expect(result.current.error).toBe("First error");

      // Second request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { redirectUrl: "https://payu.com", paymentId: "123" },
        }),
      });

      await act(async () => {
        await result.current.createPayment({
          packageType: "standard",
          provider: "payu",
          email: "test@example.com",
        });
      });

      // Error should be cleared
      expect(result.current.error).toBeNull();
    });

    it("builds correct return URL from window.location", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { redirectUrl: "https://payu.com", paymentId: "123" },
        }),
      });

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        await result.current.createPayment({
          packageType: "standard",
          provider: "payu",
          email: "test@example.com",
        });
      });

      // Verify body includes return URL
      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.returnUrl).toBe("http://localhost:3000/payment/success");
    });

    it("sends correct package type in request body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { redirectUrl: "https://payu.com", paymentId: "123" },
        }),
      });

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        await result.current.createPayment({
          packageType: "pro",
          provider: "payu",
          email: "pro@example.com",
        });
      });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.packageId).toBe("pro");
      expect(body.type).toBe("credit_purchase");
      expect(body.provider).toBe("payu");
      expect(body.email).toBe("pro@example.com");
    });

    it("sends Authorization header for authenticated requests", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { redirectUrl: "https://payu.com", paymentId: "123" },
        }),
      });

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        await result.current.createPayment({
          packageType: "standard",
          provider: "payu",
          email: "test@example.com",
        });
      });

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers["Authorization"]).toBe("Bearer test-access-token");
    });
  });

  describe("initial state", () => {
    it("starts with isCreating false", () => {
      const { result } = renderHook(() => usePayment());

      expect(result.current.isCreating).toBe(false);
    });

    it("starts with error null", () => {
      const { result } = renderHook(() => usePayment());

      expect(result.current.error).toBeNull();
    });

    it("createPayment is a stable function reference", () => {
      const { result, rerender } = renderHook(() => usePayment());

      const createPayment1 = result.current.createPayment;

      rerender();

      const createPayment2 = result.current.createPayment;

      expect(createPayment1).toBe(createPayment2);
    });
  });

  describe("all package types", () => {
    const packageTypes = ["single", "starter", "standard", "pro"] as const;

    packageTypes.forEach((packageType) => {
      it(`handles ${packageType} package type`, async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              redirectUrl: `https://payu.com/pay/${packageType}`,
              paymentId: `pay_${packageType}`,
            },
          }),
        });

        const { result } = renderHook(() => usePayment());

        let paymentResult;
        await act(async () => {
          paymentResult = await result.current.createPayment({
            packageType,
            provider: "payu",
            email: "test@example.com",
          });
        });

        expect(paymentResult?.success).toBe(true);
        expect(paymentResult?.redirectUrl).toBe(`https://payu.com/pay/${packageType}`);
      });
    });
  });

  describe("concurrent requests", () => {
    it("handles multiple sequential requests", async () => {
      const { result } = renderHook(() => usePayment());

      // First request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { redirectUrl: "https://payu.com/1", paymentId: "1" },
        }),
      });

      let result1;
      await act(async () => {
        result1 = await result.current.createPayment({
          packageType: "starter",
          provider: "payu",
          email: "test1@example.com",
        });
      });

      expect(result1?.paymentId).toBe("1");

      // Second request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { redirectUrl: "https://payu.com/2", paymentId: "2" },
        }),
      });

      let result2;
      await act(async () => {
        result2 = await result.current.createPayment({
          packageType: "standard",
          provider: "payu",
          email: "test2@example.com",
        });
      });

      expect(result2?.paymentId).toBe("2");

      // Both requests should have been made
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
