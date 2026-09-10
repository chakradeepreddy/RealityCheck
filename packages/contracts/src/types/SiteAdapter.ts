import { ExperimentSpec } from '../schemas/experiment';
import { Observation } from '../schemas/observation';

export interface CapabilityResult {
  isTestable: boolean;
  reason?: string;
}

/**
 * Interface for establishing a specific test state and reading observations.
 */
export interface SiteAdapter<TPage = any> {
  readonly id: string;
  readonly version: string;

  /**
   * Determines if this adapter supports the given target URL.
   */
  supports(url: string): boolean;

  /**
   * Pre-flights the target URL to determine if required capabilities are present.
   */
  discoverCapabilities?(page: TPage, url: string, spec: ExperimentSpec): Promise<CapabilityResult>;

  /**
   * Instructs the adapter to navigate to the correct starting page.
   */
  navigate(page: TPage, url: string): Promise<void>;

  /**
   * Instructs the adapter to establish a requested numeric state (e.g., cart subtotal or item quantity).
   * For the Boundary experiment, this is usually called multiple times with different values.
   */
  establishNumericState(page: TPage, targetValue: number, spec?: ExperimentSpec): Promise<void>;

  /**
   * Instructs the adapter to read the current DOM/network state and return an Observation.
   */
  observeState(page: TPage, url: string): Promise<Observation>;

  /**
   * Instructs the adapter to plant a unique marker in the specified target input.
   */
  plantCanaryMarker?(page: TPage, target: string, marker: string): Promise<void>;
}
