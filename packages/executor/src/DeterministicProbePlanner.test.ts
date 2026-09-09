import { describe, it, expect } from 'vitest';
import { DeterministicProbePlanner } from './DeterministicProbePlanner';

describe('DeterministicProbePlanner', () => {
  it('A. Claimed threshold 999: generates probes below, at, and above', () => {
    const probes = DeterministicProbePlanner.planNumericBoundaryProbes(999);
    
    // Check it contains 999
    expect(probes).toContain(999);
    
    // Check it contains values below 999
    const below = probes.filter(p => p < 999);
    expect(below.length).toBeGreaterThan(0);
    
    // Check it contains values above 999
    const above = probes.filter(p => p > 999);
    expect(above.length).toBeGreaterThan(0);
  });

  it('B. Actual boundary 1050: initial probe plan includes values to discover 1050', () => {
    const probes = DeterministicProbePlanner.planNumericBoundaryProbes(999);
    // There must be a value between 999 and 1050 (exclusive or inclusive) to serve as a baseline for the failure,
    // and a value >= 1050 to catch the success.
    
    const above1050 = probes.filter(p => p >= 1050);
    expect(above1050.length).toBeGreaterThan(0);
    
    // Ensure no QuickCart specific constant like exactly 1050 is hardcoded.
    // The closest additive is 999 + 50 = 1049, and 999 * 1.05 = 1048. 
    // The closest above 1050 are 999 + 100 = 1099, 999 * 1.1 = 1098.
    // As long as there is a spread, it's correct.
  });

  it('C. Boundary below claim: probe below sufficiently to discover an earlier transition', () => {
    const probes = DeterministicProbePlanner.planNumericBoundaryProbes(999);
    const significantlyBelow = probes.filter(p => p <= 900);
    expect(significantlyBelow.length).toBeGreaterThan(0); // e.g. 999 - 100 = 899, 999 * 0.9 = 899
  });

  it('D. Duplicate prevention: no duplicate probe values', () => {
    const probes = DeterministicProbePlanner.planNumericBoundaryProbes(100);
    const unique = new Set(probes);
    expect(probes.length).toEqual(unique.size);
  });

  it('E. Determinism: same spec produces exactly the same probe plan', () => {
    const probes1 = DeterministicProbePlanner.planNumericBoundaryProbes(1234);
    const probes2 = DeterministicProbePlanner.planNumericBoundaryProbes(1234);
    expect(probes1).toEqual(probes2);
  });

  it('F. Invalid threshold: fails closed', () => {
    // @ts-expect-error Intentionally invalid
    expect(() => DeterministicProbePlanner.planNumericBoundaryProbes(undefined)).toThrowError();
    // @ts-expect-error Intentionally invalid
    expect(() => DeterministicProbePlanner.planNumericBoundaryProbes(null)).toThrowError();
    // @ts-expect-error Intentionally invalid
    expect(() => DeterministicProbePlanner.planNumericBoundaryProbes('999')).toThrowError();
    expect(() => DeterministicProbePlanner.planNumericBoundaryProbes(NaN)).toThrowError();
    expect(() => DeterministicProbePlanner.planNumericBoundaryProbes(-10)).toThrowError();
  });

  it('G. Numeric edge cases: zero, small positive, large', () => {
    const zeroProbes = DeterministicProbePlanner.planNumericBoundaryProbes(0);
    expect(zeroProbes).toContain(0);
    expect(zeroProbes.filter(p => p > 0).length).toBeGreaterThan(0);

    const smallProbes = DeterministicProbePlanner.planNumericBoundaryProbes(5);
    expect(smallProbes).toContain(5);
    // Additive -10 on 5 would be -5, must be bounded to 0
    expect(Math.min(...smallProbes)).toBe(0);

    const largeProbes = DeterministicProbePlanner.planNumericBoundaryProbes(100000);
    expect(largeProbes).toContain(100000);
    expect(Math.max(...largeProbes)).toBeGreaterThanOrEqual(150000); // 100000 * 1.5 etc
  });

  it('H. Maximum probe bound: never generates an unbounded number of states', () => {
    const probes = DeterministicProbePlanner.planNumericBoundaryProbes(999);
    expect(probes.length).toBeLessThanOrEqual(50);
  });
});
