export class DeterministicProbePlanner {
  /**
   * Generates a deterministic array of numeric probes around a target threshold.
   * 
   * Strategy (Phase 1):
   * Provides a generic, bounded spread of probes to detect boundaries that are
   * exactly at the claim, slightly offset (e.g. >= vs > bugs), or moderately 
   * offset (e.g. flat rate shipping or tax calculation bugs).
   * 
   * Future Extension:
   * Can be extended to Phase 2 (adaptive expansion) and Phase 3 (binary search narrowing)
   * if the executor is upgraded to handle streaming/yield-based probe generation.
   */
  static planNumericBoundaryProbes(target: number): number[] {
    if (target === undefined || target === null || typeof target !== 'number' || !Number.isFinite(target) || target < 0) {
      throw new Error("Target must be a valid, finite, non-negative number.");
    }

    const rawProbes: number[] = [target];

    if (target === 0) {
      // For a zero threshold, probe upward to establish boundaries above zero
      rawProbes.push(1, 5, 10, 50, 100, 500, 1000);
    } else {
      // 1. Proportional offsets to generically handle very small or very large targets
      const multipliers = [0.5, 0.8, 0.9, 0.95, 0.99, 1.01, 1.05, 1.1, 1.2, 1.5, 2.0];
      for (const m of multipliers) {
        rawProbes.push(target * m);
      }

      // 2. Additive offsets to handle absolute displacements (e.g. flat shipping rates, tax gaps)
      // This ensures that even for target=999, we search up to 999+100=1099, capturing
      // an actual boundary of 1050 successfully.
      const additives = [-100, -50, -20, -10, -5, -1, 1, 5, 10, 20, 50, 100];
      for (const a of additives) {
        rawProbes.push(target + a);
      }
    }

    // Clean up probes:
    // - prevent negative states
    // - standardize to whole units using Math.floor to avoid e-commerce precision issues
    // - deduplicate
    // - sort ascending
    const cleaned = rawProbes
      .map(p => Math.max(0, Math.floor(p)))
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a - b);

    // Bounded maximum check (sanity check to prevent run-away experimentation)
    if (cleaned.length > 50) {
      throw new Error("Planner generated too many probes, exceeding safety bounds.");
    }

    return cleaned;
  }
}
