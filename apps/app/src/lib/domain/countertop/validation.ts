/**
 * Countertop Validation Module
 *
 * Functions for validating countertop configurations
 */

import type {
  CountertopGroup,
  CountertopSegment,
  CncOperation,
} from '@/types/countertop';
import type { ValidationResult } from '../types';
import { validResult, invalidResult } from '../types';
import {
  COUNTERTOP_LIMITS,
  CNC_OPERATION_LIMITS,
} from '@/lib/config';

/**
 * Validate countertop segment
 */
export const validateSegment = (segment: CountertopSegment): ValidationResult => {
  const errors: string[] = [];

  if (segment.length < COUNTERTOP_LIMITS.LENGTH.min || segment.length > COUNTERTOP_LIMITS.LENGTH.max) {
    errors.push(`Długość musi być między ${COUNTERTOP_LIMITS.LENGTH.min}mm a ${COUNTERTOP_LIMITS.LENGTH.max}mm`);
  }

  if (segment.width < COUNTERTOP_LIMITS.WIDTH.min || segment.width > COUNTERTOP_LIMITS.WIDTH.max) {
    errors.push(`Szerokość musi być między ${COUNTERTOP_LIMITS.WIDTH.min}mm a ${COUNTERTOP_LIMITS.WIDTH.max}mm`);
  }

  if (segment.thickness < COUNTERTOP_LIMITS.THICKNESS.min || segment.thickness > COUNTERTOP_LIMITS.THICKNESS.max) {
    errors.push(`Grubość musi być między ${COUNTERTOP_LIMITS.THICKNESS.min}mm a ${COUNTERTOP_LIMITS.THICKNESS.max}mm`);
  }

  // Validate overhang
  for (const [key, value] of Object.entries(segment.overhang)) {
    if (value < COUNTERTOP_LIMITS.OVERHANG.min || value > COUNTERTOP_LIMITS.OVERHANG.max) {
      errors.push(`Nawis ${key} musi być między ${COUNTERTOP_LIMITS.OVERHANG.min}mm a ${COUNTERTOP_LIMITS.OVERHANG.max}mm`);
    }
  }

  return errors.length === 0 ? validResult() : invalidResult(...errors);
};

/**
 * Validate CNC operation placement
 */
export const validateCncOperation = (
  operation: CncOperation,
  segment: CountertopSegment
): ValidationResult => {
  const errors: string[] = [];

  // Check position is within segment bounds
  if (operation.position.x < 0 || operation.position.x > segment.length) {
    errors.push('Operacja CNC poza zakresem długości blatu');
  }

  if (operation.position.y < 0 || operation.position.y > segment.width) {
    errors.push('Operacja CNC poza zakresem szerokości blatu');
  }

  // Check minimum distance from edges
  const { x, y } = operation.position;
  const minEdge = CNC_OPERATION_LIMITS.MIN_EDGE_DISTANCE;

  if (x < minEdge || (segment.length - x) < minEdge) {
    errors.push(`Operacja CNC musi być min. ${minEdge}mm od krawędzi lewej/prawej`);
  }

  if (y < minEdge || (segment.width - y) < minEdge) {
    errors.push(`Operacja CNC musi być min. ${minEdge}mm od krawędzi przedniej/tylnej`);
  }

  // Check operation dimensions fit within segment
  if (operation.dimensions.width && operation.dimensions.height) {
    const halfW = operation.dimensions.width / 2;
    const halfH = operation.dimensions.height / 2;

    if (x - halfW < minEdge || x + halfW > segment.length - minEdge) {
      errors.push('Wycięcie jest zbyt szerokie dla tej pozycji');
    }

    if (y - halfH < minEdge || y + halfH > segment.width - minEdge) {
      errors.push('Wycięcie jest zbyt wysokie dla tej pozycji');
    }
  }

  if (operation.dimensions.diameter) {
    const halfD = operation.dimensions.diameter / 2;

    if (x - halfD < minEdge || x + halfD > segment.length - minEdge ||
        y - halfD < minEdge || y + halfD > segment.width - minEdge) {
      errors.push('Otwór jest zbyt blisko krawędzi');
    }
  }

  return errors.length === 0 ? validResult() : invalidResult(...errors);
};

/**
 * Validate entire countertop group
 */
export const validateGroup = (group: CountertopGroup): ValidationResult => {
  const errors: string[] = [];

  if (group.segments.length === 0) {
    errors.push('Grupa blatu musi zawierać co najmniej jeden segment');
  }

  // Validate each segment
  for (const segment of group.segments) {
    const segmentResult = validateSegment(segment);
    if (!segmentResult.valid) {
      errors.push(...segmentResult.errors.map(e => `${segment.name}: ${e}`));
    }

    // Validate CNC operations in segment
    for (const operation of segment.cncOperations) {
      const opResult = validateCncOperation(operation, segment);
      if (!opResult.valid) {
        errors.push(...opResult.errors.map(e => `${segment.name}: ${e}`));
      }
    }
  }

  // Validate joints reference existing segments
  for (const joint of group.joints) {
    const hasSegmentA = group.segments.some(s => s.id === joint.segmentAId);
    const hasSegmentB = group.segments.some(s => s.id === joint.segmentBId);

    if (!hasSegmentA || !hasSegmentB) {
      errors.push('Połączenie odwołuje się do nieistniejącego segmentu');
    }
  }

  return errors.length === 0 ? validResult() : invalidResult(...errors);
};
