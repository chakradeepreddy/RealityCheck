import { Observation } from '@realitycheck/contracts';

export type BoundaryStatus = 
  | 'BOUNDARY_FOUND' 
  | 'BOUNDARY_NOT_ESTABLISHED' 
  | 'INSUFFICIENT_OBSERVATIONS';

export interface BoundaryAnalysisResult {
  status: BoundaryStatus;
  observedBoundary?: number; 
  lowerBound?: number; 
  upperBound?: number; 
  supportingObservations: Observation[];
  reason: string;
}

export class BoundaryEngine {
  /**
   * Deterministically analyzes a set of observations to find a numeric threshold transition.
   * Uses a >= operator conceptually: looks for a transition where the expected value
   * is achieved at or above a certain input value.
   */
  static analyzeNumericThreshold(
    observations: Observation[],
    inputField: keyof NonNullable<Observation['pageState']>,
    observableField: keyof NonNullable<Observation['pageState']>,
    expectedValue: number | boolean
  ): BoundaryAnalysisResult {
    const validObs = observations.filter(obs => {
      const state = obs.pageState;
      if (!state) return false;
      const inputVal = state[inputField];
      const outputVal = state[observableField];
      return typeof inputVal === 'number' && outputVal !== undefined;
    });

    if (validObs.length === 0) {
      return {
        status: 'INSUFFICIENT_OBSERVATIONS',
        supportingObservations: [],
        reason: 'No valid observations found with required fields.'
      };
    }

    // Sort by input value ascending
    const sorted = [...validObs].sort((a, b) => {
      return (a.pageState![inputField] as number) - (b.pageState![inputField] as number);
    });

    let highestNotMet: Observation | undefined;
    let lowestMet: Observation | undefined;

    for (const obs of sorted) {
      const val = obs.pageState![observableField];
      if (val === expectedValue) {
        if (!lowestMet) lowestMet = obs;
      } else {
        highestNotMet = obs; // Will update to the highest one since we sorted ascending
      }
    }

    if (!highestNotMet && !lowestMet) {
      return {
        status: 'INSUFFICIENT_OBSERVATIONS',
        supportingObservations: sorted,
        reason: 'No clear transition data.'
      };
    }

    if (!highestNotMet) {
      return {
        status: 'BOUNDARY_NOT_ESTABLISHED',
        supportingObservations: sorted,
        reason: 'Condition is met for all observations. No failure observed to establish a boundary.',
        upperBound: lowestMet!.pageState![inputField] as number
      };
    }

    if (!lowestMet) {
      return {
        status: 'BOUNDARY_NOT_ESTABLISHED',
        supportingObservations: sorted,
        reason: 'Condition is never met in the provided observations.',
        lowerBound: highestNotMet!.pageState![inputField] as number
      };
    }

    const lowerVal = highestNotMet.pageState![inputField] as number;
    const upperVal = lowestMet.pageState![inputField] as number;

    if (lowerVal > upperVal) {
      return {
        status: 'BOUNDARY_NOT_ESTABLISHED',
        supportingObservations: sorted,
        reason: 'Non-monotonic transition detected (condition met at lower value but failed at higher value).',
        lowerBound: lowerVal,
        upperBound: upperVal
      };
    }

    return {
      status: 'BOUNDARY_FOUND',
      observedBoundary: upperVal,
      lowerBound: lowerVal,
      upperBound: upperVal,
      supportingObservations: sorted,
      reason: `Transition found between ${lowerVal} and ${upperVal}. Boundary established at ${upperVal}.`
    };
  }
}
