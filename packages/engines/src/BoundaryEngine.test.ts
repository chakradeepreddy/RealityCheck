import { describe, it, expect } from 'vitest';
import { BoundaryEngine } from './BoundaryEngine';
import { Observation } from '@realitycheck/contracts';

const createObservation = (subtotal: number, shipping: number): Observation => ({
  schemaVersion: '1.0.0',
  timestamp: new Date().toISOString(),
  url: 'https://example.com',
  pageState: {
    cartSubtotal: subtotal,
    shippingCost: shipping
  }
});

describe('BoundaryEngine', () => {
  describe('analyzeNumericThreshold', () => {

    it('Fixture A — Contradictory Shipping (discovers 1050)', () => {
      // Claim: Free shipping on orders of 999 or more.
      // Expected transition: 1050
      const observations = [
        createObservation(900, 79),
        createObservation(950, 79),
        createObservation(999, 79),
        createObservation(1000, 79),
        createObservation(1025, 79),
        createObservation(1050, 0),
        createObservation(1100, 0)
      ];

      const result = BoundaryEngine.analyzeNumericThreshold(
        observations,
        'cartSubtotal',
        'shippingCost',
        0
      );

      expect(result.status).toBe('BOUNDARY_FOUND');
      expect(result.observedBoundary).toBe(1050);
      expect(result.lowerBound).toBe(1025);
      expect(result.upperBound).toBe(1050);
    });

    it('Fixture B — Honest Shipping (discovers 999)', () => {
      // Claim: Free shipping on orders of 999 or more.
      // Expected transition: 999
      const observations = [
        createObservation(900, 79),
        createObservation(950, 79),
        createObservation(998, 79),
        createObservation(999, 0),
        createObservation(1000, 0),
        createObservation(1050, 0)
      ];

      const result = BoundaryEngine.analyzeNumericThreshold(
        observations,
        'cartSubtotal',
        'shippingCost',
        0
      );

      expect(result.status).toBe('BOUNDARY_FOUND');
      expect(result.observedBoundary).toBe(999);
      expect(result.lowerBound).toBe(998);
      expect(result.upperBound).toBe(999);
    });

    it('Fixture C — Insufficient Evidence (no transition above)', () => {
      const observations = [
        createObservation(900, 79),
        createObservation(950, 79),
        createObservation(999, 79)
      ];

      const result = BoundaryEngine.analyzeNumericThreshold(
        observations,
        'cartSubtotal',
        'shippingCost',
        0
      );

      expect(result.status).toBe('BOUNDARY_NOT_ESTABLISHED');
      expect(result.observedBoundary).toBeUndefined();
      expect(result.lowerBound).toBe(999);
      expect(result.upperBound).toBeUndefined();
    });

    it('Unsorted observations still work', () => {
      const observations = [
        createObservation(1000, 0),
        createObservation(950, 79),
        createObservation(900, 79),
        createObservation(1050, 0),
        createObservation(998, 79),
        createObservation(999, 0)
      ];

      const result = BoundaryEngine.analyzeNumericThreshold(
        observations,
        'cartSubtotal',
        'shippingCost',
        0
      );

      expect(result.status).toBe('BOUNDARY_FOUND');
      expect(result.observedBoundary).toBe(999);
    });

    it('Duplicate observations do not corrupt the result', () => {
      const observations = [
        createObservation(998, 79),
        createObservation(998, 79),
        createObservation(999, 0),
        createObservation(999, 0)
      ];

      const result = BoundaryEngine.analyzeNumericThreshold(
        observations,
        'cartSubtotal',
        'shippingCost',
        0
      );

      expect(result.status).toBe('BOUNDARY_FOUND');
      expect(result.observedBoundary).toBe(999);
      expect(result.lowerBound).toBe(998);
    });

    it('Invalid/missing observations are handled safely', () => {
      const valid = createObservation(999, 0);
      const invalidNoState = { ...valid, pageState: undefined };
      const invalidNoShipping = { ...valid, pageState: { cartSubtotal: 1000 } };
      
      const observations = [
        createObservation(900, 79),
        invalidNoState as Observation,
        invalidNoShipping as Observation,
        valid
      ];

      const result = BoundaryEngine.analyzeNumericThreshold(
        observations,
        'cartSubtotal',
        'shippingCost',
        0
      );

      expect(result.status).toBe('BOUNDARY_FOUND');
      expect(result.observedBoundary).toBe(999);
      expect(result.supportingObservations.length).toBe(2);
    });

    it('Non-monotonic behavior (fails at higher value)', () => {
      const observations = [
        createObservation(900, 79),
        createObservation(950, 0), // Success early
        createObservation(1000, 79) // Fails later
      ];

      const result = BoundaryEngine.analyzeNumericThreshold(
        observations,
        'cartSubtotal',
        'shippingCost',
        0
      );

      expect(result.status).toBe('BOUNDARY_NOT_ESTABLISHED');
      expect(result.reason).toContain('Non-monotonic');
      expect(result.lowerBound).toBe(1000);
      expect(result.upperBound).toBe(950);
    });
    
    it('All observations meet the condition', () => {
      const observations = [
        createObservation(900, 0),
        createObservation(950, 0),
        createObservation(1000, 0)
      ];

      const result = BoundaryEngine.analyzeNumericThreshold(
        observations,
        'cartSubtotal',
        'shippingCost',
        0
      );

      expect(result.status).toBe('BOUNDARY_NOT_ESTABLISHED');
      expect(result.upperBound).toBe(900);
      expect(result.lowerBound).toBeUndefined();
    });

    it('Empty valid observations', () => {
      const result = BoundaryEngine.analyzeNumericThreshold(
        [],
        'cartSubtotal',
        'shippingCost',
        0
      );

      expect(result.status).toBe('INSUFFICIENT_OBSERVATIONS');
    });
  });
});
