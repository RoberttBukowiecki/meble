/**
 * Tests for auth callback route security.
 * Tests the getSafeRedirectUrl function to prevent open redirect attacks.
 */

// Copy of the function from route.ts for testing
function getSafeRedirectUrl(next: string | null): string {
  if (!next) return '/';

  // Must start with / (relative path)
  if (!next.startsWith('/')) return '/';

  // Prevent protocol-relative URLs (//example.com)
  if (next.startsWith('//')) return '/';

  // Prevent backslash-based attacks (/\evil.com)
  if (next.includes('\\')) return '/';

  // Prevent javascript: or other protocols
  if (next.includes(':')) return '/';

  // Prevent null bytes and other control characters
  if (/[\x00-\x1f\x7f]/.test(next)) return '/';

  // Prevent encoded characters that could bypass checks
  if (next.includes('%')) {
    try {
      // Recursively decode to catch double/triple encoding
      let decoded = next;
      let prevDecoded = '';
      let iterations = 0;
      const maxIterations = 5;

      while (decoded !== prevDecoded && iterations < maxIterations) {
        prevDecoded = decoded;
        decoded = decodeURIComponent(decoded);
        iterations++;
      }

      // Check decoded value for dangerous patterns
      if (
        decoded.includes('//') ||
        decoded.includes(':') ||
        decoded.includes('\\') ||
        /[\x00-\x1f\x7f]/.test(decoded)
      ) {
        return '/';
      }
    } catch {
      // Invalid encoding - reject
      return '/';
    }
  }

  return next;
}

describe('getSafeRedirectUrl', () => {
  describe('valid redirects', () => {
    it('allows simple relative paths', () => {
      expect(getSafeRedirectUrl('/dashboard')).toBe('/dashboard');
    });

    it('allows nested paths', () => {
      expect(getSafeRedirectUrl('/user/settings/profile')).toBe(
        '/user/settings/profile'
      );
    });

    it('allows paths with query strings', () => {
      expect(getSafeRedirectUrl('/search?q=test')).toBe('/search?q=test');
    });

    it('allows root path', () => {
      expect(getSafeRedirectUrl('/')).toBe('/');
    });

    it('returns root for null input', () => {
      expect(getSafeRedirectUrl(null)).toBe('/');
    });

    it('returns root for empty string', () => {
      expect(getSafeRedirectUrl('')).toBe('/');
    });
  });

  describe('blocked redirects - open redirect attacks', () => {
    it('blocks absolute URLs', () => {
      expect(getSafeRedirectUrl('https://evil.com')).toBe('/');
    });

    it('blocks protocol-relative URLs', () => {
      expect(getSafeRedirectUrl('//evil.com')).toBe('/');
    });

    it('blocks javascript: protocol', () => {
      expect(getSafeRedirectUrl('javascript:alert(1)')).toBe('/');
    });

    it('blocks data: protocol', () => {
      expect(getSafeRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe('/');
    });

    it('blocks URLs not starting with /', () => {
      expect(getSafeRedirectUrl('evil.com')).toBe('/');
    });

    it('blocks encoded protocol-relative URLs', () => {
      expect(getSafeRedirectUrl('/%2f/evil.com')).toBe('/');
    });

    it('blocks backslash-based attacks', () => {
      expect(getSafeRedirectUrl('/\\evil.com')).toBe('/');
    });

    it('blocks paths with colons (potential protocol injection)', () => {
      expect(getSafeRedirectUrl('/redirect:evil.com')).toBe('/');
    });
  });

  describe('edge cases', () => {
    it('blocks malformed URL-encoded strings', () => {
      expect(getSafeRedirectUrl('/%00')).toBe('/');
    });

    it('blocks double-encoded attacks', () => {
      expect(getSafeRedirectUrl('/%252f%252fevil.com')).toBe('/');
    });
  });
});
