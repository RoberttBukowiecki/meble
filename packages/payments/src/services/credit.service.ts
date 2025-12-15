/**
 * Credit Service
 *
 * Service for managing export credits for both logged-in users and guests.
 */

import { createHash } from 'crypto';

// ============================================================================
// PROJECT HASH
// ============================================================================

export interface ProjectData {
  parts: Array<{
    materialId?: string;
    width: number;
    height: number;
    depth: number;
  }>;
  materials: Array<{
    id: string;
  }>;
}

/**
 * Generate a hash for a project to identify it for Smart Export sessions.
 * Projects with the same hash are considered the same for re-export purposes.
 */
export function hashProject(project: ProjectData): string {
  // Create a normalized representation of the project
  const data = {
    parts: project.parts
      .map((p) => ({
        materialId: p.materialId || '',
        dimensions: [
          Math.round(p.width),
          Math.round(p.height),
          Math.round(p.depth),
        ].sort((a, b) => a - b), // Sort to make order-independent
      }))
      .sort((a, b) => a.materialId.localeCompare(b.materialId)),
    materials: project.materials
      .map((m) => m.id)
      .sort(),
  };

  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 16);
}

// ============================================================================
// CREDIT BALANCE TYPES
// ============================================================================

export interface UserCreditBalance {
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  hasUnlimited: boolean;
  unlimitedExpiresAt: Date | null;
}

export interface GuestCreditBalance {
  availableCredits: number;
  expiresAt: Date;
}

export interface UseCreditResult {
  success: boolean;
  sessionId?: string;
  creditsRemaining: number;
  message: string;
  isFreeReexport: boolean;
}

// ============================================================================
// GUEST SESSION
// ============================================================================

export const GUEST_SESSION_KEY = 'e_meble_guest_session';

export interface GuestSession {
  id: string;
  createdAt: string;
  lastActivityAt: string;
}

/**
 * Generate a new guest session ID
 */
export function generateGuestSessionId(): string {
  return crypto.randomUUID();
}

// ============================================================================
// CREDIT PACKAGE VALIDATION
// ============================================================================

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  validDays?: number;
}

export const CREDIT_PACKAGES: Record<string, CreditPackage> = {
  single: {
    id: 'single',
    name: 'Pojedynczy export',
    credits: 1,
    price: 900,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    credits: 5,
    price: 1900,
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    credits: 20,
    price: 4900,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    credits: -1, // Unlimited
    price: 9900,
    validDays: 30,
  },
};

/**
 * Get credit package by ID
 */
export function getCreditPackage(packageId: string): CreditPackage | null {
  return CREDIT_PACKAGES[packageId] || null;
}

/**
 * Validate package ID
 */
export function isValidPackageId(packageId: string): boolean {
  return packageId in CREDIT_PACKAGES;
}

// ============================================================================
// SMART EXPORT CONFIG
// ============================================================================

export const SMART_EXPORT_CONFIG = {
  /** Session duration in milliseconds (24 hours) */
  sessionDurationMs: 24 * 60 * 60 * 1000,

  /** Session duration in hours */
  sessionDurationHours: 24,
};

// ============================================================================
// GUEST CREDITS CONFIG
// ============================================================================

export const GUEST_CREDITS_CONFIG = {
  /** Days until guest credits expire */
  expirationDays: 30,

  /** Expiration in milliseconds */
  expirationMs: 30 * 24 * 60 * 60 * 1000,

  /** Bonus credits when registering */
  registrationBonus: 2,
};
