import { ExperimentSpec } from '../schemas/experiment';

/**
 * ClaimCompiler represents the architectural boundary for the LLM.
 * 
 * Its sole responsibility is to translate a natural-language claim into a 
 * structured, deterministic ExperimentSpec.
 * 
 * It MUST NOT:
 * - Write Playwright code
 * - Manipulate the browser
 * - Inspect browser results
 * - Generate evidence
 * - Decide the final verdict
 */
export interface ClaimCompiler {
  /**
   * Compiles a natural language claim into an ExperimentSpec.
   * 
   * @param claim The natural language claim (e.g., "Free shipping on orders over $50")
   * @param targetUrl The target URL to test the claim against
   * @returns A promise resolving to a strictly validated ExperimentSpec
   */
  compileClaim(claim: string, targetUrl: string): Promise<ExperimentSpec>;
}
