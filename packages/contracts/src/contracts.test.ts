import { describe, it, expect } from 'vitest';
import { ExperimentSpecSchema } from './schemas/experiment';
import { ObservationSchema } from './schemas/observation';
import { VerdictEnum } from './types/Verdict';

describe('Contracts', () => {
  describe('ExperimentSpecSchema', () => {
    it('should validate a correct ExperimentSpec', () => {
      const validSpec = {
        schemaVersion: '1.0.0',
        primitive: 'BOUNDARY',
        boundaryType: 'SPEND_TO_SAVE',
        targetUrl: 'https://example.com/store',
        testConditions: {
          itemsToAdd: [
            { id: '123', quantity: 2 }
          ],
          cartSubtotalTarget: 50
        },
        expectedObservables: {
          shippingCost: 0
        }
      };
      
      const result = ExperimentSpecSchema.safeParse(validSpec);
      expect(result.success).toBe(true);
    });

    it('should reject an invalid ExperimentSpec', () => {
      const invalidSpec = {
        schemaVersion: '1.0.0',
        primitive: 'INVALID_PRIMITIVE', // Invalid primitive
        targetUrl: 'not-a-url',
        expectedObservables: {}
      };
      
      const result = ExperimentSpecSchema.safeParse(invalidSpec);
      expect(result.success).toBe(false);
    });
  });

  describe('ObservationSchema', () => {
    it('should validate a correct Observation', () => {
      const validObs = {
        schemaVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        url: 'https://example.com/cart',
        pageState: {
          cartSubtotal: 55,
          shippingCost: 0
        }
      };

      const result = ObservationSchema.safeParse(validObs);
      expect(result.success).toBe(true);
    });

    it('should reject an invalid Observation', () => {
      const invalidObs = {
        schemaVersion: '1.0.0',
        timestamp: 'not-a-date', // invalid date
        url: 'https://example.com/cart'
      };

      const result = ObservationSchema.safeParse(invalidObs);
      expect(result.success).toBe(false);
    });
  });

  describe('Verdict', () => {
    it('should constrain verdicts', () => {
      const validVerdicts = Object.values(VerdictEnum);
      expect(validVerdicts).toContain('SUPPORTED');
      expect(validVerdicts).toContain('CONTRADICTED');
      expect(validVerdicts).toContain('INCONCLUSIVE');
      expect(validVerdicts.length).toBe(3);
    });
  });
});
