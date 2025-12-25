import {
  validatePassword,
  passwordsMatch,
  DEFAULT_PASSWORD_REQUIREMENTS,
} from './passwordValidation';

describe('passwordValidation', () => {
  describe('validatePassword', () => {
    it('accepts valid password with default requirements', () => {
      const result = validatePassword('securePass123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects password shorter than minimum length', () => {
      const result = validatePassword('short1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Haslo musi miec minimum 8 znakow');
    });

    it('accepts password exactly at minimum length', () => {
      const result = validatePassword('abcdefg1');
      expect(result.isValid).toBe(true);
    });

    it('rejects password without lowercase when required', () => {
      const result = validatePassword('UPPERCASE123', {
        ...DEFAULT_PASSWORD_REQUIREMENTS,
        requireLowercase: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Haslo musi zawierac mala litere');
    });

    it('rejects password without number when required', () => {
      const result = validatePassword('nolowercasehere', {
        ...DEFAULT_PASSWORD_REQUIREMENTS,
        requireNumber: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Haslo musi zawierac cyfre');
    });

    it('rejects password without uppercase when required', () => {
      const result = validatePassword('lowercase123', {
        ...DEFAULT_PASSWORD_REQUIREMENTS,
        requireUppercase: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Haslo musi zawierac wielka litere');
    });

    it('rejects password without special char when required', () => {
      const result = validatePassword('Password123', {
        ...DEFAULT_PASSWORD_REQUIREMENTS,
        requireSpecialChar: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Haslo musi zawierac znak specjalny');
    });

    it('accepts password with all requirements met', () => {
      const result = validatePassword('Secure@Pass123', {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecialChar: true,
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns multiple errors when multiple requirements fail', () => {
      const result = validatePassword('abc', {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecialChar: true,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('passwordsMatch', () => {
    it('returns true for matching passwords', () => {
      expect(passwordsMatch('password123', 'password123')).toBe(true);
    });

    it('returns false for non-matching passwords', () => {
      expect(passwordsMatch('password123', 'password456')).toBe(false);
    });

    it('returns false for case differences', () => {
      expect(passwordsMatch('Password', 'password')).toBe(false);
    });

    it('returns true for empty strings', () => {
      expect(passwordsMatch('', '')).toBe(true);
    });
  });
});
