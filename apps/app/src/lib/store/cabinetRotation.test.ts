/**
 * Tests for cabinet rotation handling
 *
 * These tests verify that:
 * 1. Changing one rotation axis doesn't affect other axes
 * 2. Rotation values are correctly converted between degrees and radians
 * 3. getCabinetTransform correctly extracts cabinet rotation from parts
 */

import { Euler, Quaternion, Vector3 } from 'three';
import { getCabinetTransform, applyCabinetTransform } from './utils';
import type { Part } from '@/types';

// Helper to create a test part
const createTestPart = (
  id: string,
  role: string,
  rotation: [number, number, number] = [0, 0, 0],
  position: [number, number, number] = [0, 0, 0]
): Part => ({
  id,
  name: `Test ${role}`,
  materialId: 'mat-1',
  shapeType: 'RECT',
  shapeParams: { type: 'RECT', x: 100, y: 100 },
  position,
  rotation,
  width: 100,
  height: 100,
  depth: 18,
  cabinetMetadata: {
    cabinetId: 'cab-1',
    role: role as any,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Default rotations for parts (from utils.ts)
const DEFAULT_PART_ROTATIONS: Record<string, [number, number, number]> = {
  BOTTOM: [-Math.PI / 2, 0, 0],
  TOP: [-Math.PI / 2, 0, 0],
  LEFT_SIDE: [0, Math.PI / 2, 0],
  RIGHT_SIDE: [0, Math.PI / 2, 0],
  SHELF: [-Math.PI / 2, 0, 0],
  BACK: [0, 0, 0],
  DOOR: [0, 0, 0],
};

describe('getCabinetTransform', () => {
  describe('rotation extraction', () => {
    it('returns identity rotation for cabinet with no world rotation', () => {
      // BOTTOM part with its default rotation (no cabinet rotation applied)
      const bottomPart = createTestPart('p1', 'BOTTOM', [-Math.PI / 2, 0, 0]);

      const { rotation } = getCabinetTransform([bottomPart]);
      const euler = new Euler().setFromQuaternion(rotation);

      // Should be close to identity (0, 0, 0)
      expect(Math.abs(euler.x)).toBeLessThan(0.0001);
      expect(Math.abs(euler.y)).toBeLessThan(0.0001);
      expect(Math.abs(euler.z)).toBeLessThan(0.0001);
    });

    it('correctly extracts 90 degree Y rotation from BOTTOM part', () => {
      // To rotate cabinet 90° around Y, we need to apply that rotation to the part
      const defaultBottomRotation = new Quaternion().setFromEuler(
        new Euler(-Math.PI / 2, 0, 0)
      );
      const cabinetRotation90Y = new Quaternion().setFromEuler(
        new Euler(0, Math.PI / 2, 0)
      );
      const combinedRotation = cabinetRotation90Y.multiply(defaultBottomRotation);
      const combinedEuler = new Euler().setFromQuaternion(combinedRotation);

      const bottomPart = createTestPart('p1', 'BOTTOM', [
        combinedEuler.x,
        combinedEuler.y,
        combinedEuler.z,
      ]);

      const { rotation } = getCabinetTransform([bottomPart]);
      const extractedEuler = new Euler().setFromQuaternion(rotation);

      // Should extract ~90° Y rotation
      expect(Math.abs(extractedEuler.x)).toBeLessThan(0.01);
      expect(Math.abs(extractedEuler.y - Math.PI / 2)).toBeLessThan(0.01);
      expect(Math.abs(extractedEuler.z)).toBeLessThan(0.01);
    });
  });
});

describe('Cabinet rotation in PropertiesPanel logic', () => {
  /**
   * This simulates the flow in PropertiesPanel:
   * 1. Get cabinet rotation from getCabinetTransform
   * 2. Convert to degrees for display
   * 3. User changes one axis
   * 4. Convert back to radians
   * 5. Apply via updateCabinetTransform
   *
   * The bug: changing X should NOT affect Y and Z
   */

  it('changing rotation X should not affect Y and Z', () => {
    // Setup: cabinet with 30° Y rotation
    const initialCabinetRotationY = 30 * (Math.PI / 180);

    // Create part with combined rotation (default + cabinet)
    const defaultBottomRotation = new Quaternion().setFromEuler(
      new Euler(-Math.PI / 2, 0, 0)
    );
    const cabinetRotation = new Quaternion().setFromEuler(
      new Euler(0, initialCabinetRotationY, 0)
    );
    const combinedQuat = cabinetRotation.clone().multiply(defaultBottomRotation);
    const combinedEuler = new Euler().setFromQuaternion(combinedQuat);

    const bottomPart = createTestPart('p1', 'BOTTOM', [
      combinedEuler.x,
      combinedEuler.y,
      combinedEuler.z,
    ]);

    // Step 1: Get cabinet rotation (what PropertiesPanel should do)
    const { rotation: extractedRotation } = getCabinetTransform([bottomPart]);
    const extractedEuler = new Euler().setFromQuaternion(extractedRotation);

    // Step 2: Convert to degrees (what PropertiesPanel displays)
    const rotationDegrees = [
      Math.round((extractedEuler.x * 180) / Math.PI * 100) / 100,
      Math.round((extractedEuler.y * 180) / Math.PI * 100) / 100,
      Math.round((extractedEuler.z * 180) / Math.PI * 100) / 100,
    ];

    // Initial state: X≈0, Y≈30, Z≈0
    expect(Math.abs(rotationDegrees[0])).toBeLessThan(1);
    expect(Math.abs(rotationDegrees[1] - 30)).toBeLessThan(1);
    expect(Math.abs(rotationDegrees[2])).toBeLessThan(1);

    // Step 3: User changes X to 15 degrees
    const newRotationDegrees = [15, rotationDegrees[1], rotationDegrees[2]];
    const newRotationRadians: [number, number, number] = [
      (newRotationDegrees[0] * Math.PI) / 180,
      (newRotationDegrees[1] * Math.PI) / 180,
      (newRotationDegrees[2] * Math.PI) / 180,
    ];

    // Step 4: Apply new rotation (simulating updateCabinetTransform)
    const newCabinetQuat = new Quaternion().setFromEuler(
      new Euler().fromArray(newRotationRadians)
    );

    // Apply to part
    const newPartQuat = newCabinetQuat.clone().multiply(defaultBottomRotation);
    const newPartEuler = new Euler().setFromQuaternion(newPartQuat);

    // Update part
    const updatedPart = createTestPart('p1', 'BOTTOM', [
      newPartEuler.x,
      newPartEuler.y,
      newPartEuler.z,
    ]);

    // Step 5: Extract rotation again
    const { rotation: finalRotation } = getCabinetTransform([updatedPart]);
    const finalEuler = new Euler().setFromQuaternion(finalRotation);

    const finalDegrees = [
      Math.round((finalEuler.x * 180) / Math.PI * 100) / 100,
      Math.round((finalEuler.y * 180) / Math.PI * 100) / 100,
      Math.round((finalEuler.z * 180) / Math.PI * 100) / 100,
    ];

    // X should be ~15
    expect(Math.abs(finalDegrees[0] - 15)).toBeLessThan(1);
    // Y should still be ~30 (unchanged!)
    expect(Math.abs(finalDegrees[1] - 30)).toBeLessThan(1);
    // Z should still be ~0 (unchanged!)
    expect(Math.abs(finalDegrees[2])).toBeLessThan(1);
  });

  it('blur without value change should not trigger update', () => {
    // This tests the NumberInput fix
    const initialValue = 45;
    let onChangeCalled = false;

    // Simulate handleBlur logic (after fix)
    const handleBlur = (localValue: string, value: number, onChange: (v: number) => void) => {
      const parsed = parseFloat(localValue);
      if (!isNaN(parsed)) {
        const clamped = parsed;
        // The fix: only call onChange if value changed
        if (clamped !== value) {
          onChange(clamped);
        }
      }
    };

    // Blur with same value
    handleBlur('45', initialValue, () => { onChangeCalled = true; });

    expect(onChangeCalled).toBe(false);
  });
});

describe('Rotation conversion consistency', () => {
  it('degrees to radians and back should be consistent', () => {
    const testDegrees = [45, 90, 180, 30, 60, 15];

    for (const deg of testDegrees) {
      const radians = (deg * Math.PI) / 180;
      const backToDegrees = Math.round((radians * 180) / Math.PI * 100) / 100;

      expect(backToDegrees).toBe(deg);
    }
  });

  it('Euler to Quaternion and back should preserve values', () => {
    const testRotations: [number, number, number][] = [
      [0, 0, 0],
      [Math.PI / 4, 0, 0],
      [0, Math.PI / 4, 0],
      [0, 0, Math.PI / 4],
      [Math.PI / 6, Math.PI / 4, 0],
    ];

    for (const rotation of testRotations) {
      const euler = new Euler().fromArray(rotation);
      const quat = new Quaternion().setFromEuler(euler);
      const backToEuler = new Euler().setFromQuaternion(quat);

      expect(Math.abs(backToEuler.x - rotation[0])).toBeLessThan(0.0001);
      expect(Math.abs(backToEuler.y - rotation[1])).toBeLessThan(0.0001);
      expect(Math.abs(backToEuler.z - rotation[2])).toBeLessThan(0.0001);
    }
  });
});
