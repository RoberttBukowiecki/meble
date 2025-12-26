// Track mock calls
const mockCalls = {
  redirect: [] as Array<{ url: string; status: number }>,
  next: [] as Array<Record<string, never>>,
  json: [] as Array<{ body: unknown; status?: number }>,
};

// Mock next/server with inline classes
jest.mock("next/server", () => {
  // Mock cookies storage (defined inside jest.mock scope)
  class MockCookies {
    private _cookies: Map<string, { name: string; value: string }> = new Map();

    getAll() {
      return Array.from(this._cookies.values());
    }

    set(name: string, value: string, _options?: Record<string, unknown>) {
      this._cookies.set(name, { name, value });
    }

    get(name: string) {
      return this._cookies.get(name);
    }
  }

  class MockNextResponse {
    status: number;
    headers: Map<string, string>;
    cookies: MockCookies;
    private _jsonBody?: unknown;

    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.status = init?.status || 200;
      this.headers = new Map();
      this.cookies = new MockCookies();
      if (init?.headers) {
        const headers = init.headers as Record<string, string>;
        Object.entries(headers).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value);
        });
      }
    }

    static redirect(url: URL | string, status = 307) {
      mockCalls.redirect.push({ url: url.toString(), status });
      const response = new MockNextResponse(null, { status });
      response.headers.set("location", url.toString());
      return response;
    }

    static next() {
      mockCalls.next.push({});
      return new MockNextResponse();
    }

    static json(body: unknown, init?: ResponseInit) {
      mockCalls.json.push({ body, status: init?.status });
      const response = new MockNextResponse(JSON.stringify(body), init);
      response._jsonBody = body;
      return response;
    }

    async json() {
      return this._jsonBody;
    }
  }

  class MockNextRequest {
    url: string;
    nextUrl: { pathname: string; searchParams: URLSearchParams };

    constructor(url: string) {
      this.url = url;
      const urlObj = new URL(url);
      this.nextUrl = {
        pathname: urlObj.pathname,
        searchParams: urlObj.searchParams,
      };
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: MockNextRequest,
  };
});

// Mock the updateSession function
const mockUpdateSession = jest.fn();
jest.mock("@/lib/supabase/middleware", () => ({
  updateSession: () => mockUpdateSession(),
}));

// Import NextResponse after mocking for creating mock responses
import { NextResponse } from "next/server";

// We need to import middleware after mocking
import { middleware } from "./middleware";

// Helper to create mock request
function createMockRequest(url: string) {
  const urlObj = new URL(url);
  return {
    url,
    nextUrl: {
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams,
    },
  };
}

describe("Auth Middleware", () => {
  const mockSupabaseResponse = NextResponse.next();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCalls.redirect = [];
    mockCalls.next = [];
    mockCalls.json = [];
  });

  describe("Protected routes", () => {
    const protectedRoutes = [
      "/dashboard",
      "/dashboard/projects",
      "/settings",
      "/settings/profile",
      "/projects",
      "/projects/123",
      "/orders",
      "/orders/456",
    ];

    protectedRoutes.forEach((route) => {
      it(`redirects unauthenticated user from ${route} to login`, async () => {
        mockUpdateSession.mockResolvedValue({
          supabaseResponse: mockSupabaseResponse,
          user: null,
          supabase: {},
        });

        const request = createMockRequest(`http://localhost:3000${route}`);
        const response = await middleware(request as any);

        expect(response.status).toBe(307); // Redirect status
        expect(response.headers.get("location")).toContain("/login");
        expect(response.headers.get("location")).toContain(`redirect=${encodeURIComponent(route)}`);
      });

      it(`allows authenticated user to access ${route}`, async () => {
        mockUpdateSession.mockResolvedValue({
          supabaseResponse: mockSupabaseResponse,
          user: { id: "user-123", email: "test@example.com" },
          supabase: {},
        });

        const request = createMockRequest(`http://localhost:3000${route}`);
        const response = await middleware(request as any);

        // Should return the supabase response, not a redirect
        expect(response.status).not.toBe(307);
      });
    });
  });

  describe("Auth routes (login, register, etc.)", () => {
    const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

    authRoutes.forEach((route) => {
      it(`redirects authenticated user from ${route} to home`, async () => {
        mockUpdateSession.mockResolvedValue({
          supabaseResponse: mockSupabaseResponse,
          user: { id: "user-123", email: "test@example.com" },
          supabase: {},
        });

        const request = createMockRequest(`http://localhost:3000${route}`);
        const response = await middleware(request as any);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("http://localhost:3000/");
      });

      it(`allows unauthenticated user to access ${route}`, async () => {
        mockUpdateSession.mockResolvedValue({
          supabaseResponse: mockSupabaseResponse,
          user: null,
          supabase: {},
        });

        const request = createMockRequest(`http://localhost:3000${route}`);
        const response = await middleware(request as any);

        expect(response.status).not.toBe(307);
      });
    });

    it("redirects to custom redirect URL if provided", async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: mockSupabaseResponse,
        user: { id: "user-123", email: "test@example.com" },
        supabase: {},
      });

      const request = createMockRequest("http://localhost:3000/login?redirect=/dashboard");
      const response = await middleware(request as any);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });
  });

  describe("Protected API routes", () => {
    const protectedApiRoutes = [
      "/api/credits",
      "/api/credits/use",
      "/api/projects",
      "/api/projects/123",
      "/api/orders",
      "/api/profile",
    ];

    protectedApiRoutes.forEach((route) => {
      it(`returns 401 for unauthenticated request to ${route}`, async () => {
        mockUpdateSession.mockResolvedValue({
          supabaseResponse: mockSupabaseResponse,
          user: null,
          supabase: {},
        });

        const request = createMockRequest(`http://localhost:3000${route}`);
        const response = await middleware(request as any);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body).toEqual({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        });
      });

      it(`allows authenticated request to ${route}`, async () => {
        mockUpdateSession.mockResolvedValue({
          supabaseResponse: mockSupabaseResponse,
          user: { id: "user-123", email: "test@example.com" },
          supabase: {},
        });

        const request = createMockRequest(`http://localhost:3000${route}`);
        const response = await middleware(request as any);

        expect(response.status).not.toBe(401);
      });
    });
  });

  describe("Public routes", () => {
    const publicRoutes = ["/", "/about", "/pricing", "/contact"];

    publicRoutes.forEach((route) => {
      it(`allows unauthenticated access to ${route}`, async () => {
        mockUpdateSession.mockResolvedValue({
          supabaseResponse: mockSupabaseResponse,
          user: null,
          supabase: {},
        });

        const request = createMockRequest(`http://localhost:3000${route}`);
        const response = await middleware(request as any);

        expect(response.status).not.toBe(307);
        expect(response.status).not.toBe(401);
      });

      it(`allows authenticated access to ${route}`, async () => {
        mockUpdateSession.mockResolvedValue({
          supabaseResponse: mockSupabaseResponse,
          user: { id: "user-123", email: "test@example.com" },
          supabase: {},
        });

        const request = createMockRequest(`http://localhost:3000${route}`);
        const response = await middleware(request as any);

        expect(response.status).not.toBe(307);
        expect(response.status).not.toBe(401);
      });
    });
  });

  describe("Session refresh", () => {
    it("calls updateSession for every request", async () => {
      mockUpdateSession.mockResolvedValue({
        supabaseResponse: mockSupabaseResponse,
        user: null,
        supabase: {},
      });

      const request = createMockRequest("http://localhost:3000/");
      await middleware(request as any);

      expect(mockUpdateSession).toHaveBeenCalled();
    });
  });
});
