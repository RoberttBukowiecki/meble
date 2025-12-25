/**
 * Password validation utilities for authentication forms.
 * Provides consistent password strength checking across the application.
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: false,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,
};

/**
 * Validates a password against the specified requirements.
 * Returns validation result with list of failed requirements.
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < requirements.minLength) {
    errors.push(`Haslo musi miec minimum ${requirements.minLength} znakow`);
  }

  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Haslo musi zawierac wielka litere');
  }

  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Haslo musi zawierac mala litere');
  }

  if (requirements.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Haslo musi zawierac cyfre');
  }

  if (requirements.requireSpecialChar && !/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Haslo musi zawierac znak specjalny');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if passwords match.
 */
export function passwordsMatch(
  password: string,
  confirmPassword: string
): boolean {
  return password === confirmPassword;
}
