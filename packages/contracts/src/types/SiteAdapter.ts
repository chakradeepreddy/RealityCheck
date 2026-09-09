import { ExperimentSpec } from '../schemas/experiment';
import { Observation } from '../schemas/observation';

/**
 * SiteAdapter maps experiment semantics to concrete browser actions and observables
 * for a specific target site.
 * 
 * RealityCheck cannot magically understand every arbitrary website. The adapter
 * bridges the gap between the generic ExperimentSpec and the specific DOM/network
 * interactions required for a given site.
 */
export interface SiteAdapter {
  /**
   * The identifier for this adapter (e.g., 'quickcart')
   */
  readonly id: string;
  
  /**
   * The version of this adapter
   */
  readonly version: string;

  /**
   * Executes the given ExperimentSpec using Playwright (or similar) and returns
   * the observed results.
   * 
   * Note: The adapter implementation will require access to a browser context/page,
   * but the interface is kept abstract here.
   * 
   * @param spec The experiment to run
   * @param browserContext Context object (e.g. Playwright Page) - type to be defined later
   * @returns A promise resolving to the Observation gathered during execution
   */
  executeExperiment(spec: ExperimentSpec, browserContext: any): Promise<Observation>;
}
