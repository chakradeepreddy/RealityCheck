import { ExperimentSpec, Verdict, VerdictEnum } from '@realitycheck/contracts';
import { BoundaryAnalysisResult } from '@realitycheck/engines';

export interface VerifierResult {
  verdict: Verdict;
  reason: string;
  claimedBoundary?: number;
  observedBoundary?: number;
}

export class DeterministicVerifier {
  /**
   * Verifies the observed boundary against the claimed ExperimentSpec.
   * Ensures fail-closed semantics: any missing evidence or ambiguity results in INCONCLUSIVE.
   * 
   * This logic is purely deterministic and does NOT rely on LLMs or browser context.
   */
  static verifyBoundary(spec: ExperimentSpec, analysis: BoundaryAnalysisResult): VerifierResult {
    // 1. Validate spec semantics
    if (spec.primitive !== 'BOUNDARY' || spec.boundaryType !== 'NUMERIC_THRESHOLD') {
      return {
        verdict: VerdictEnum.INCONCLUSIVE,
        reason: 'Unsupported experiment primitive or boundary type for this verifier version.'
      };
    }

    const claimedBoundary = spec.testConditions.cartSubtotalTarget;
    if (claimedBoundary === undefined) {
      return {
        verdict: VerdictEnum.INCONCLUSIVE,
        reason: 'ExperimentSpec is missing the required claimed threshold (cartSubtotalTarget).'
      };
    }

    // 2. Evaluate boundary analysis status
    if (analysis.status === 'INSUFFICIENT_OBSERVATIONS') {
      return {
        verdict: VerdictEnum.INCONCLUSIVE,
        claimedBoundary,
        reason: 'Required transition could not be established from the available observations due to insufficient data.'
      };
    }

    if (analysis.status === 'BOUNDARY_NOT_ESTABLISHED') {
      return {
        verdict: VerdictEnum.INCONCLUSIVE,
        claimedBoundary,
        reason: 'Required transition could not be established from the available observations. Boundary was not established.'
      };
    }

    // 3. Compare verified bounds
    const observedBoundary = analysis.observedBoundary;
    if (observedBoundary === undefined) {
      return {
        verdict: VerdictEnum.INCONCLUSIVE,
        claimedBoundary,
        reason: 'Boundary Engine reported BOUNDARY_FOUND but provided no observed boundary value.'
      };
    }

    if (observedBoundary === claimedBoundary) {
      return {
        verdict: VerdictEnum.SUPPORTED,
        claimedBoundary,
        observedBoundary,
        reason: `Observed free-shipping transition matches the claimed threshold of ₹${claimedBoundary}.`
      };
    } else {
      return {
        verdict: VerdictEnum.CONTRADICTED,
        claimedBoundary,
        observedBoundary,
        reason: `Claimed free-shipping threshold is ₹${claimedBoundary}, but observed free shipping begins at ₹${observedBoundary}.`
      };
    }
  }
}
