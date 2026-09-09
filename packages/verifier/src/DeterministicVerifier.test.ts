import { describe, it, expect } from 'vitest';
import { DeterministicVerifier } from './DeterministicVerifier';
import { ExperimentSpec } from '@realitycheck/contracts';
import { BoundaryAnalysisResult } from '@realitycheck/engines';

const createSpec = (cartSubtotalTarget?: number, boundaryType: any = 'NUMERIC_THRESHOLD', primitive: any = 'BOUNDARY'): ExperimentSpec => ({
  schemaVersion: '1.0.0',
  primitive,
  boundaryType,
  targetUrl: 'https://example.com',
  testConditions: {
    cartSubtotalTarget
  },
  expectedObservables: {
    shippingCost: 0
  }
});

const createAnalysis = (status: BoundaryAnalysisResult['status'], observedBoundary?: number): BoundaryAnalysisResult => ({
  status,
  observedBoundary,
  supportingObservations: [],
  reason: 'Test reason'
});

describe('DeterministicVerifier', () => {
  it('Fixture A — HONEST (SUPPORTED)', () => {
    const spec = createSpec(999);
    const analysis = createAnalysis('BOUNDARY_FOUND', 999);
    
    const result = DeterministicVerifier.verifyBoundary(spec, analysis);
    
    expect(result.verdict).toBe('SUPPORTED');
    expect(result.claimedBoundary).toBe(999);
    expect(result.observedBoundary).toBe(999);
    expect(result.reason).toContain('matches the claimed threshold of ₹999');
  });

  it('Fixture B — CONTRADICTED (Observed higher)', () => {
    const spec = createSpec(999);
    const analysis = createAnalysis('BOUNDARY_FOUND', 1050);
    
    const result = DeterministicVerifier.verifyBoundary(spec, analysis);
    
    expect(result.verdict).toBe('CONTRADICTED');
    expect(result.claimedBoundary).toBe(999);
    expect(result.observedBoundary).toBe(1050);
    expect(result.reason).toContain('Claimed free-shipping threshold is ₹999, but observed free shipping begins at ₹1050');
  });

  it('Fixture C — INCONCLUSIVE (Boundary not established)', () => {
    const spec = createSpec(999);
    const analysis = createAnalysis('BOUNDARY_NOT_ESTABLISHED');
    
    const result = DeterministicVerifier.verifyBoundary(spec, analysis);
    
    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.claimedBoundary).toBe(999);
    expect(result.reason).toContain('could not be established');
  });

  it('Fixture D — EARLIER OBSERVED BOUNDARY (CONTRADICTED)', () => {
    const spec = createSpec(999);
    const analysis = createAnalysis('BOUNDARY_FOUND', 950);
    
    const result = DeterministicVerifier.verifyBoundary(spec, analysis);
    
    // Based on exact integer numeric comparison semantics: any mismatch is CONTRADICTED
    expect(result.verdict).toBe('CONTRADICTED');
    expect(result.claimedBoundary).toBe(999);
    expect(result.observedBoundary).toBe(950);
  });

  it('Returns INCONCLUSIVE for INSUFFICIENT_OBSERVATIONS', () => {
    const spec = createSpec(999);
    const analysis = createAnalysis('INSUFFICIENT_OBSERVATIONS');
    
    const result = DeterministicVerifier.verifyBoundary(spec, analysis);
    
    expect(result.verdict).toBe('INCONCLUSIVE');
  });

  it('Returns INCONCLUSIVE for missing claimed threshold', () => {
    const spec = createSpec(undefined);
    const analysis = createAnalysis('BOUNDARY_FOUND', 999);
    
    const result = DeterministicVerifier.verifyBoundary(spec, analysis);
    
    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.reason).toContain('missing the required claimed threshold');
  });

  it('Returns INCONCLUSIVE for unsupported semantics (primitive)', () => {
    const spec = createSpec(999, 'NUMERIC_THRESHOLD', 'CANARY');
    const analysis = createAnalysis('BOUNDARY_FOUND', 999);
    
    const result = DeterministicVerifier.verifyBoundary(spec, analysis);
    
    expect(result.verdict).toBe('INCONCLUSIVE');
  });

  it('Returns INCONCLUSIVE for unsupported semantics (boundaryType)', () => {
    const spec = createSpec(999, 'QUANTITY_DISCOUNT');
    const analysis = createAnalysis('BOUNDARY_FOUND', 999);
    
    const result = DeterministicVerifier.verifyBoundary(spec, analysis);
    
    expect(result.verdict).toBe('INCONCLUSIVE');
  });

  it('Returns INCONCLUSIVE if BOUNDARY_FOUND but observedBoundary is missing', () => {
    const spec = createSpec(999);
    const analysis = createAnalysis('BOUNDARY_FOUND', undefined);
    
    const result = DeterministicVerifier.verifyBoundary(spec, analysis);
    
    expect(result.verdict).toBe('INCONCLUSIVE');
  });

  it('Repeated identical inputs give same deterministic result', () => {
    const spec = createSpec(999);
    const analysis = createAnalysis('BOUNDARY_FOUND', 999);
    
    const result1 = DeterministicVerifier.verifyBoundary(spec, analysis);
    const result2 = DeterministicVerifier.verifyBoundary(spec, analysis);
    
    expect(result1.verdict).toBe(result2.verdict);
    expect(result1.reason).toBe(result2.reason);
  });
});
