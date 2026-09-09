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

  /**
   * Verifies canary network observations against the explicit allowlist.
   * 
   * - CONTRADICTED: Marker observed leaking to ANY domain outside the allowlist.
   * - SUPPORTED: Successfully ran and absolutely no markers observed outside the allowlist.
   * - INCONCLUSIVE: Missing observations or malformed inputs.
   */
  static verifyCanary(spec: ExperimentSpec, observations: { url: string, method: string, markerFound: boolean }[]): VerifierResult {
    if (spec.primitive !== 'CANARY') {
      return {
        verdict: VerdictEnum.INCONCLUSIVE,
        reason: 'Unsupported experiment primitive for verifyCanary.'
      };
    }

    if (!observations || observations.length === 0) {
      return {
        verdict: VerdictEnum.INCONCLUSIVE,
        reason: 'No network observations available to verify.'
      };
    }

    const allowedDestinations = spec.testConditions.allowedDestinations || [];
    const forbiddenLeaks: string[] = [];

    for (const obs of observations) {
      if (obs.markerFound) {
        let isAllowed = false;
        try {
          const obsUrl = new URL(obs.url);
          for (const allowed of allowedDestinations) {
            // Check if hostname matches or ends with the allowed domain (e.g. subdomains)
            if (obsUrl.hostname === allowed || obsUrl.hostname.endsWith('.' + allowed)) {
              isAllowed = true;
              break;
            }
          }
        } catch (e) {
          // If URL parsing fails but marker was found, it's a leak (fail safe)
        }

        if (!isAllowed) {
          forbiddenLeaks.push(obs.url);
        }
      }
    }

    if (forbiddenLeaks.length > 0) {
      return {
        verdict: VerdictEnum.CONTRADICTED,
        reason: `Marker leaked to unauthorized destinations: ${forbiddenLeaks.join(', ')}`
      };
    }

    return {
      verdict: VerdictEnum.SUPPORTED,
      reason: 'No marker leaks observed to unauthorized destinations.'
    };
  }
}
